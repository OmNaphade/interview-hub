const MAX_GLOBAL_SAMPLES = 5000;
const MAX_ENDPOINT_SAMPLES = 500;
const MAX_GROUP_SAMPLES = 300;
const MAX_BUCKET_SAMPLES = 120;
const BUCKET_MS = 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;

const startedAt = new Date();
const processStartUsage = process.cpuUsage();
const processStartHr = process.hrtime.bigint();

let eventLoopLagMs = 0;
let lastLoopCheck = Date.now();
setInterval(() => {
  const now = Date.now();
  const elapsed = now - lastLoopCheck;
  const drift = Math.max(0, elapsed - 1000);
  eventLoopLagMs = drift;
  lastLoopCheck = now;
}, 1000).unref();

const state = {
  activeRequests: 0,
  peakActiveRequests: 0,
  totalRequests: 0,
  totalApiRequests: 0,
  totalErrors: 0,
  globalDurations: [],
  statusCodes: new Map(),
  endpoints: new Map(),
  timeline: new Map(),
  endpointTimeline: new Map(),
  groq: {
    totalCalls: 0,
    totalErrors: 0,
    byOperation: new Map(),
    timeline: new Map(),
  },
  containers: {
    totalRuns: 0,
    totalErrors: 0,
    byLanguage: new Map(),
    timeline: new Map(),
  },
  dockerChecks: {
    totalChecks: 0,
    availableCount: 0,
    unavailableCount: 0,
    lastCheckAt: null,
    lastAvailable: null,
  },
};

function pushBounded(list, value, maxItems) {
  list.push(value);
  if (list.length > maxItems) {
    list.shift();
  }
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizePath(pathname) {
  return String(pathname || "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ":id")
    .replace(/\b\d{2,}\b/g, ":id")
    .replace(/\b[0-9a-f]{16,}\b/gi, ":id");
}

function percentile(samples, p) {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const position = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[position];
}

function rounded(value) {
  return Number(safeNumber(value).toFixed(2));
}

function toBucketTime(value = Date.now()) {
  return Math.floor(value / BUCKET_MS) * BUCKET_MS;
}

function pruneTimelineMap(map, now = Date.now()) {
  const cutoff = now - RETENTION_MS;
  for (const key of map.keys()) {
    if (key < cutoff) {
      map.delete(key);
    }
  }
}

function getOrCreateTimelineBucket(map, now = Date.now()) {
  const key = toBucketTime(now);
  if (!map.has(key)) {
    map.set(key, {
      ts: key,
      requests: 0,
      apiRequests: 0,
      errors: 0,
      count: 0,
      latencyTotalMs: 0,
      latencies: [],
    });
  }
  pruneTimelineMap(map, now);
  return map.get(key);
}

function updateTimelineBucket(bucket, { request = false, apiRequest = false, error = false, durationMs = 0 }) {
  if (request) bucket.requests += 1;
  if (apiRequest) bucket.apiRequests += 1;
  if (error) bucket.errors += 1;

  const elapsed = safeNumber(durationMs);
  if (elapsed > 0) {
    bucket.count += 1;
    bucket.latencyTotalMs += elapsed;
    pushBounded(bucket.latencies, elapsed, MAX_BUCKET_SAMPLES);
  }
}

function initEndpointEntry(method, path) {
  const key = `${method} ${path}`;
  if (!state.endpoints.has(key)) {
    state.endpoints.set(key, {
      key,
      method,
      path,
      count: 0,
      errors: 0,
      durations: [],
      totalDurationMs: 0,
      lastStatusCode: null,
      lastSeenAt: null,
    });
  }

  if (!state.endpointTimeline.has(key)) {
    state.endpointTimeline.set(key, new Map());
  }

  return state.endpoints.get(key);
}

function initOperationEntry(map, name) {
  if (!map.has(name)) {
    map.set(name, {
      name,
      count: 0,
      errors: 0,
      durations: [],
      totalDurationMs: 0,
      lastSeenAt: null,
    });
  }
  return map.get(name);
}

function addStatusCode(code) {
  const key = String(code);
  state.statusCodes.set(key, (state.statusCodes.get(key) || 0) + 1);
}

function markRequestStart() {
  state.activeRequests += 1;
  if (state.activeRequests > state.peakActiveRequests) {
    state.peakActiveRequests = state.activeRequests;
  }
}

function markRequestEnd() {
  state.activeRequests = Math.max(0, state.activeRequests - 1);
}

function recordHttpRequest({ method, path, statusCode, durationMs }) {
  const safeMethod = String(method || "GET").toUpperCase();
  const safePath = normalizePath(path);
  const safeStatusCode = Number(statusCode) || 0;
  const safeDurationMs = safeNumber(durationMs);
  const isApi = safePath.startsWith("/api/") || safePath === "/api";
  const isError = safeStatusCode >= 400;

  state.totalRequests += 1;
  if (isApi) state.totalApiRequests += 1;
  if (isError) state.totalErrors += 1;

  pushBounded(state.globalDurations, safeDurationMs, MAX_GLOBAL_SAMPLES);
  addStatusCode(safeStatusCode);

  const globalBucket = getOrCreateTimelineBucket(state.timeline);
  updateTimelineBucket(globalBucket, {
    request: true,
    apiRequest: isApi,
    error: isError,
    durationMs: safeDurationMs,
  });

  const endpoint = initEndpointEntry(safeMethod, safePath);
  endpoint.count += 1;
  if (isError) endpoint.errors += 1;
  endpoint.totalDurationMs += safeDurationMs;
  endpoint.lastStatusCode = safeStatusCode;
  endpoint.lastSeenAt = new Date().toISOString();
  pushBounded(endpoint.durations, safeDurationMs, MAX_ENDPOINT_SAMPLES);

  const endpointBucketMap = state.endpointTimeline.get(endpoint.key);
  const endpointBucket = getOrCreateTimelineBucket(endpointBucketMap);
  updateTimelineBucket(endpointBucket, {
    request: true,
    error: isError,
    durationMs: safeDurationMs,
  });
}

function recordGroqCall({ operation, durationMs, success }) {
  const op = String(operation || "unknown");
  const elapsed = safeNumber(durationMs);
  const ok = Boolean(success);

  state.groq.totalCalls += 1;
  if (!ok) state.groq.totalErrors += 1;

  const item = initOperationEntry(state.groq.byOperation, op);
  item.count += 1;
  if (!ok) item.errors += 1;
  item.totalDurationMs += elapsed;
  item.lastSeenAt = new Date().toISOString();
  pushBounded(item.durations, elapsed, MAX_GROUP_SAMPLES);

  const groqBucket = getOrCreateTimelineBucket(state.groq.timeline);
  updateTimelineBucket(groqBucket, {
    request: true,
    error: !ok,
    durationMs: elapsed,
  });
}

function recordContainerRun({ language, durationMs, success, isDatabase }) {
  const lang = String(language || "unknown");
  const elapsed = safeNumber(durationMs);
  const ok = Boolean(success);

  state.containers.totalRuns += 1;
  if (!ok) state.containers.totalErrors += 1;

  const item = initOperationEntry(state.containers.byLanguage, lang);
  item.isDatabase = Boolean(isDatabase);
  item.count += 1;
  if (!ok) item.errors += 1;
  item.totalDurationMs += elapsed;
  item.lastSeenAt = new Date().toISOString();
  pushBounded(item.durations, elapsed, MAX_GROUP_SAMPLES);

  const containerBucket = getOrCreateTimelineBucket(state.containers.timeline);
  updateTimelineBucket(containerBucket, {
    request: true,
    error: !ok,
    durationMs: elapsed,
  });
}

function recordDockerCheck({ available }) {
  const isAvailable = Boolean(available);
  state.dockerChecks.totalChecks += 1;
  state.dockerChecks.lastCheckAt = new Date().toISOString();
  state.dockerChecks.lastAvailable = isAvailable;
  if (isAvailable) {
    state.dockerChecks.availableCount += 1;
  } else {
    state.dockerChecks.unavailableCount += 1;
  }
}

function summarizeOperations(map) {
  return [...map.values()]
    .map((item) => ({
      name: item.name,
      count: item.count,
      errors: item.errors,
      errorRate: item.count ? rounded((item.errors / item.count) * 100) : 0,
      avgMs: item.count ? rounded(item.totalDurationMs / item.count) : 0,
      p95Ms: rounded(percentile(item.durations, 95)),
      lastSeenAt: item.lastSeenAt,
      ...(typeof item.isDatabase === "boolean" ? { isDatabase: item.isDatabase } : {}),
    }))
    .sort((a, b) => b.count - a.count);
}

function mapTimeline(map, windowMs) {
  const cutoff = Date.now() - windowMs;
  return [...map.values()]
    .filter((item) => item.ts >= cutoff)
    .sort((a, b) => a.ts - b.ts)
    .map((item) => ({
      ts: new Date(item.ts).toISOString(),
      requests: item.requests,
      apiRequests: item.apiRequests,
      errors: item.errors,
      avgMs: item.count ? rounded(item.latencyTotalMs / item.count) : 0,
      p95Ms: rounded(percentile(item.latencies, 95)),
    }));
}

function parseWindowMs(value) {
  const raw = String(value || "15m").trim().toLowerCase();
  const matched = raw.match(/^(\d+)([smhd])$/);
  if (!matched) return 15 * 60 * 1000;

  const amount = Number.parseInt(matched[1], 10);
  const unit = matched[2];
  const factors = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  const ms = amount * factors[unit];
  return Math.max(60 * 1000, Math.min(ms, RETENTION_MS));
}

function getRuntimeSnapshot() {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage(processStartUsage);
  const elapsedMicros = Number((process.hrtime.bigint() - processStartHr) / 1000n) || 1;

  return {
    pid: process.pid,
    nodeVersion: process.version,
    activeRequests: state.activeRequests,
    peakActiveRequests: state.peakActiveRequests,
    eventLoopLagMs: rounded(eventLoopLagMs),
    cpuUsagePercent: rounded(((cpu.user + cpu.system) / elapsedMicros) * 100),
    memoryMb: {
      rss: rounded(mem.rss / (1024 * 1024)),
      heapUsed: rounded(mem.heapUsed / (1024 * 1024)),
      heapTotal: rounded(mem.heapTotal / (1024 * 1024)),
      external: rounded(mem.external / (1024 * 1024)),
    },
  };
}

function getMonitoringSnapshot({ window = "15m", endpointKey = "" } = {}) {
  const windowMs = parseWindowMs(window);

  const endpointRows = [...state.endpoints.values()]
    .map((item) => ({
      key: item.key,
      method: item.method,
      path: item.path,
      count: item.count,
      errors: item.errors,
      errorRate: item.count ? rounded((item.errors / item.count) * 100) : 0,
      avgMs: item.count ? rounded(item.totalDurationMs / item.count) : 0,
      p95Ms: rounded(percentile(item.durations, 95)),
      lastStatusCode: item.lastStatusCode,
      lastSeenAt: item.lastSeenAt,
    }))
    .sort((a, b) => b.count - a.count);

  let endpointDetail = null;
  if (endpointKey && state.endpoints.has(endpointKey)) {
    const endpoint = state.endpoints.get(endpointKey);
    const endpointTimeline = state.endpointTimeline.get(endpointKey) || new Map();
    endpointDetail = {
      key: endpoint.key,
      method: endpoint.method,
      path: endpoint.path,
      count: endpoint.count,
      errors: endpoint.errors,
      avgMs: endpoint.count ? rounded(endpoint.totalDurationMs / endpoint.count) : 0,
      p95Ms: rounded(percentile(endpoint.durations, 95)),
      timeline: mapTimeline(endpointTimeline, windowMs),
    };
  }

  return {
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    window,
    windowMs,
    totals: {
      requests: state.totalRequests,
      apiRequests: state.totalApiRequests,
      errors: state.totalErrors,
      groqCalls: state.groq.totalCalls,
      containerRuns: state.containers.totalRuns,
    },
    latencyMs: {
      avg: state.globalDurations.length
        ? rounded(state.globalDurations.reduce((sum, value) => sum + value, 0) / state.globalDurations.length)
        : 0,
      p50: rounded(percentile(state.globalDurations, 50)),
      p95: rounded(percentile(state.globalDurations, 95)),
      max: rounded(Math.max(0, ...state.globalDurations)),
    },
    statusCodes: Object.fromEntries(state.statusCodes.entries()),
    topEndpoints: endpointRows.slice(0, 25),
    endpointDetail,
    series: {
      requests: mapTimeline(state.timeline, windowMs),
      groq: mapTimeline(state.groq.timeline, windowMs),
      containers: mapTimeline(state.containers.timeline, windowMs),
    },
    runtime: getRuntimeSnapshot(),
    groq: {
      totalCalls: state.groq.totalCalls,
      totalErrors: state.groq.totalErrors,
      byOperation: summarizeOperations(state.groq.byOperation),
    },
    containers: {
      totalRuns: state.containers.totalRuns,
      totalErrors: state.containers.totalErrors,
      byLanguage: summarizeOperations(state.containers.byLanguage),
      dockerChecks: {
        ...state.dockerChecks,
        availabilityRate: state.dockerChecks.totalChecks
          ? rounded((state.dockerChecks.availableCount / state.dockerChecks.totalChecks) * 100)
          : 0,
      },
    },
  };
}

module.exports = {
  getMonitoringSnapshot,
  markRequestStart,
  markRequestEnd,
  parseWindowMs,
  recordHttpRequest,
  recordGroqCall,
  recordContainerRun,
  recordDockerCheck,
};
