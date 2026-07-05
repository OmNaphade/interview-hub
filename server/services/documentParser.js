const fs = require("node:fs");
const path = require("node:path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("node:crypto");
const net = require("node:net");
const dns = require("node:dns").promises;

function isPrivateIPv4(ip) {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;

  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;

  return false;
}

function isPrivateIPv6(ip) {
  const normalized = String(ip || "").toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  return false;
}

async function assertSafeRemoteUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP(S) URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new Error("Local network addresses are not allowed");
  }

  const directIpType = net.isIP(hostname);
  if (directIpType === 4 && isPrivateIPv4(hostname)) {
    throw new Error("Private network addresses are not allowed");
  }
  if (directIpType === 6 && isPrivateIPv6(hostname)) {
    throw new Error("Private network addresses are not allowed");
  }

  const resolved = await dns.lookup(hostname, { all: true, verbatim: true });
  for (const record of resolved) {
    if (
      (record.family === 4 && isPrivateIPv4(record.address)) ||
      (record.family === 6 && isPrivateIPv6(record.address))
    ) {
      throw new Error("Resolved target is in a private network range");
    }
  }

  return parsed.toString();
}

// Extract text from PDF
async function extractPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error("❌ PDF extraction error:", error);
    throw new Error("Failed to extract PDF");
  }
}

// Extract text from DOCX
async function extractDOCX(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error("❌ DOCX extraction error:", error);
    throw new Error("Failed to extract DOCX");
  }
}

// Extract text from URL
async function extractURL(url) {
  try {
    const safeUrl = await assertSafeRemoteUrl(url);

    const response = await axios.get(safeUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
      maxContentLength: 5 * 1024 * 1024,
      maxBodyLength: 5 * 1024 * 1024,
    });

    const $ = cheerio.load(response.data);
    $("script, style, nav, footer").remove();

    const text = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    return text;
  } catch (error) {
    console.error("❌ URL extraction error:", error);
    throw new Error("Failed to extract URL");
  }
}

// Calculate file hash for deduplication
function calculateHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Calculate text hash for URLs
function calculateTextHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// Chunk text into overlapping pieces
function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.substring(start, end).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
  }

  return chunks;
}

// Detect topics from text (simple keyword matching)
function detectTopics(text) {
  const topics = [];
  const keywords = {
    dsa: [
      "algorithm",
      "data structure",
      "array",
      "linked list",
      "tree",
      "graph",
      "sort",
    ],
    python: [
      "python",
      "django",
      "flask",
      "pandas",
      "numpy",
      "def",
      "lambda",
    ],
    javascript: [
      "javascript",
      "react",
      "node.js",
      "async",
      "await",
      "promise",
      "callback",
    ],
    java: ["java", "spring", "jvm", "maven", "gradle", "class", "interface"],
    system_design: [
      "system design",
      "architecture",
      "scalability",
      "microservices",
      "database",
      "cache",
    ],
    dbms: ["database", "sql", "transaction", "index", "normalization"],
    networking: [
      "network",
      "tcp",
      "ip",
      "http",
      "dns",
      "socket",
      "protocol",
    ],
    react: ["react", "component", "jsx", "hook", "state", "props", "redux"],
    nodejs: ["node.js", "express", "npm", "npm", "callback", "event"],
  };

  const lowerText = text.toLowerCase();

  for (const [topic, keys] of Object.entries(keywords)) {
    if (keys.some((key) => lowerText.includes(key))) {
      topics.push(topic);
    }
  }

  return [...new Set(topics)];
}

module.exports = {
  extractPDF,
  extractDOCX,
  extractURL,
  calculateHash,
  calculateTextHash,
  chunkText,
  detectTopics,
};
