const { execSync, execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { AppError } = require("../middleware/errorHandler");
const { recordContainerRun, recordDockerCheck } = require("./monitoringService");

const WORK_DIR = path.join(__dirname, "..", "datafiles", "playground");

const execFileAsync = promisify(execFile);

let dockerAvailable = false;

async function checkDocker() {
  try {
    execSync("docker info", { timeout: 5000, stdio: "pipe" });
    dockerAvailable = true;
    console.log("✅ Docker available — playground execution enabled");
  } catch {
    dockerAvailable = false;
    console.log("⚠️  Docker not available — playground execution disabled");
  }
  recordDockerCheck({ available: dockerAvailable });
  return dockerAvailable;
}

function isDockerAvailable() {
  return dockerAvailable;
}

const LANGUAGE_CONFIG = {
  cpp: {
    id: "cpp", label: "C++", image: "gcc:13.2-bookworm", ext: "cpp",
    runCommand: (f) => `sh -c "g++ -o /tmp/solution /code/${f} && /tmp/solution"`,
    memory: "256m", timeout: 30000,
  },
  java8: {
    id: "java8", label: "Java 8", image: "eclipse-temurin:8-jdk-jammy", ext: "java",
    prepareCommand: (f) => `sh -c "cp /code/${f} /tmp/Main.java && cd /tmp && javac Main.java && java Main"`,
    memory: "512m", timeout: 30000,
  },
  java11: {
    id: "java11", label: "Java 11", image: "eclipse-temurin:11-jdk-jammy", ext: "java",
    prepareCommand: (f) => `sh -c "cp /code/${f} /tmp/Main.java && cd /tmp && javac Main.java && java Main"`,
    memory: "512m", timeout: 30000,
  },
  java17: {
    id: "java17", label: "Java 17", image: "eclipse-temurin:17-jdk-jammy", ext: "java",
    prepareCommand: (f) => `sh -c "cp /code/${f} /tmp/Main.java && cd /tmp && javac Main.java && java Main"`,
    memory: "512m", timeout: 30000,
  },
  java21: {
    id: "java21", label: "Java 21", image: "eclipse-temurin:21-jdk-jammy", ext: "java",
    prepareCommand: (f) => `sh -c "cp /code/${f} /tmp/Main.java && cd /tmp && javac Main.java && java Main"`,
    memory: "512m", timeout: 30000,
  },
  javascript: {
    id: "javascript", label: "JavaScript", image: "node:22-slim", ext: "js",
    runCommand: (f) => `node /code/${f}`,
    memory: "256m", timeout: 30000,
  },
  python: {
    id: "python", label: "Python", image: "python:3.12-slim", ext: "py",
    runCommand: (f) => `python3 /code/${f}`,
    memory: "256m", timeout: 30000,
  },
  mysql: {
    id: "mysql", label: "MySQL", image: "mysql:8.0", ext: "sql",
    isDatabase: true,
    dbName: "playground",
    dbPort: 3306,
    memory: "256m", timeout: 120000,
  },
  postgresql: {
    id: "postgresql", label: "PostgreSQL", image: "postgres:16", ext: "sql",
    isDatabase: true,
    dbName: "playground",
    dbPort: 5432,
    memory: "256m", timeout: 120000,
  },
};

function ensureWorkDir() {
  if (!fs.existsSync(WORK_DIR)) {
    fs.mkdirSync(WORK_DIR, { recursive: true });
  }
}

async function runCode(language, code) {
  const startedAt = Date.now();
  let success = false;
  let isDatabase = false;

  if (!language || !code) {
    recordContainerRun({
      language: language || "unknown",
      durationMs: Date.now() - startedAt,
      success: false,
      isDatabase: false,
    });
    throw new AppError(400, "Language and code are required");
  }

  if (!dockerAvailable) {
    recordContainerRun({
      language,
      durationMs: Date.now() - startedAt,
      success: false,
      isDatabase: false,
    });
    throw new AppError(503, "Code execution is only available in development. Docker is required but not running on this server.");
  }

  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    recordContainerRun({
      language,
      durationMs: Date.now() - startedAt,
      success: false,
      isDatabase: false,
    });
    throw new AppError(400, `Unsupported language: ${language}`);
  }

  isDatabase = Boolean(config.isDatabase);

  // Validate code size
  if (code.length > 100000) {
    recordContainerRun({
      language,
      durationMs: Date.now() - startedAt,
      success: false,
      isDatabase,
    });
    throw new AppError(400, "Code exceeds maximum length of 100KB");
  }

  ensureWorkDir();
  const sessionId = crypto.randomBytes(8).toString("hex");
  const sessionDir = path.join(WORK_DIR, sessionId);

  try {
    fs.mkdirSync(sessionDir, { recursive: true });
    const filename = `code.${config.ext}`;
    fs.writeFileSync(path.join(sessionDir, filename), code);

    if (config.isDatabase) {
      const result = await runDatabaseQuery(config, sessionId, sessionDir, filename);
      success = !result.error;
      return result;
    }
    const result = await runCodeContainer(config, sessionDir, filename);
    success = !result.error;
    return result;
  } catch (error) {
    const result = handleDockerError(sessionDir, error);
    success = !result.error;
    return result;
  } finally {
    recordContainerRun({
      language,
      durationMs: Date.now() - startedAt,
      success,
      isDatabase,
    });
    cleanupDir(sessionDir);
  }
}

async function runCodeContainer(config, sessionDir, filename) {
  const runProgram = config.prepareCommand
    ? config.prepareCommand(filename)
    : config.runCommand(filename);

  const args = [
    "run",
    "--rm",
    "--network",
    "none",
    "-m",
    config.memory,
    "--cpus",
    "1",
    "--ulimit",
    "nproc=64",
    "--ulimit",
    "nofile=64",
    "-v",
    `${sessionDir}:/code:ro`,
    config.image,
    "sh",
    "-c",
    runProgram,
  ];

  const { stdout } = await execFileAsync("docker", args, {
    timeout: config.timeout,
    encoding: "utf-8",
    maxBuffer: 1024 * 1024,
  });

  return { output: stdout.trim(), error: false };
}

async function runDatabaseQuery(config, sessionId, sessionDir, filename) {
  const containerName = `playground-${config.id}-${sessionId}`;
  const dbPassword = crypto.randomBytes(16).toString("base64url");
  const dbEnv = config.id === "mysql"
    ? {
        MYSQL_ROOT_PASSWORD: dbPassword,
        MYSQL_DATABASE: config.dbName || "playground",
      }
    : {
        POSTGRES_PASSWORD: dbPassword,
        POSTGRES_DB: config.dbName || "playground",
      };

  let containerCreated = false;

  try {
    // Start database container
    const runArgs = ["run", "-d", "--name", containerName];
    for (const [key, value] of Object.entries(dbEnv)) {
      runArgs.push("-e", `${key}=${value}`);
    }
    runArgs.push("-m", config.memory, "-v", `${sessionDir}:/code:ro`, config.image);

    await execFileAsync("docker", runArgs, {
      timeout: 60000,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });
    containerCreated = true;

    // Wait for database to be ready with polling
    const maxWait = config.timeout;
    const startTime = Date.now();
    let lastError = "";

    while (Date.now() - startTime < maxWait) {
      try {
        const checkArgs = config.id === "mysql"
          ? ["exec", containerName, "mysqladmin", "ping", "-uroot", `-p${dbPassword}`, "--silent"]
          : ["exec", containerName, "pg_isready", "-U", "postgres"];

        const { stdout } = await execFileAsync("docker", checkArgs, {
          timeout: 5000,
          encoding: "utf-8",
          maxBuffer: 1024 * 1024,
        });
        const result = stdout || "";
        if (result.includes("mysqld is alive") || result.includes("accepting connections")) {
          break;
        }
      } catch (e) {
        lastError = e.message;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (Date.now() - startTime >= maxWait) {
      throw new Error(`Database failed to start within timeout. Last error: ${lastError}`);
    }

    // Read and execute SQL
    const sqlPath = path.join(sessionDir, filename);
    const sql = fs.readFileSync(sqlPath, "utf-8");
    if (!sql.trim()) {
      throw new Error("SQL query is empty");
    }

    const queryCommand = config.id === "mysql"
      ? `mysql -uroot -p${dbPassword} ${config.dbName || "playground"} -t < /code/${filename}`
      : `PGPASSWORD=${dbPassword} psql -U postgres -d ${config.dbName || "playground"} -f /code/${filename}`;

    const { stdout } = await execFileAsync(
      "docker",
      ["exec", containerName, "sh", "-c", queryCommand],
      { timeout: 30000, encoding: "utf-8", maxBuffer: 1024 * 1024 }
    );

    return { output: stdout.trim(), error: false };
  } finally {
    // Always cleanup container if it was created
    if (containerCreated) {
      try {
        await execFileAsync("docker", ["kill", containerName], { timeout: 10000, encoding: "utf-8" });
      } catch { /* ignore cleanup errors */ }

      try {
        await execFileAsync("docker", ["rm", containerName], { timeout: 10000, encoding: "utf-8" });
      } catch { /* ignore cleanup errors */ }
    }
  }
}

function handleDockerError(sessionDir, error) {
  cleanupDir(sessionDir);

  if (error instanceof AppError) throw error;

  // Handle specific Docker errors
  const message = error.stderr || error.stdout || error.message || "Unknown error";

  if (message.includes("Cannot connect to the Docker daemon")) {
    return { output: "Docker is not running. Please start Docker Desktop and try again.", error: true };
  }
  if (message.includes("Unable to find image") || message.includes("repository does not exist")) {
    return { output: "Docker image not found locally. Pulling images... Please try again in a moment.", error: true };
  }
  if (message.includes("timed out") || message.includes("ETIMEDOUT")) {
    return { output: "Execution timed out. Your code may have an infinite loop or be too complex.", error: true };
  }
  if (message.includes("Killed") || message.includes("exited with code 137")) {
    return { output: "Out of memory. Your code used too much memory.", error: true };
  }

  return { output: message, error: true };
}

function cleanupDir(dir) {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

function getLanguages() {
  return Object.entries(LANGUAGE_CONFIG).map(([id, c]) => ({
    id, label: c.label, ext: c.ext, isDatabase: !!c.isDatabase,
  }));
}

// Async image pulling in parallel with progress logging
async function ensureImages() {
  const images = [...new Set(Object.values(LANGUAGE_CONFIG).map((c) => c.image))];

  console.log("🔍 Checking Docker images for playground...");

  const shell = process.platform === "win32" ? "cmd.exe" : true;

  const pullPromises = images.map(async (image) => {
    try {
      // Check if image exists locally first
      execSync(`docker image inspect ${image}`, { timeout: 5000, shell });
      return { image, status: "already pulled" };
    } catch {
      console.log(`  ⬇️  Pulling ${image}...`);
      try {
        execSync(`docker pull ${image}`, { timeout: 300000, shell });
        return { image, status: "pulled" };
      } catch (pullError) {
        console.warn(`  ⚠️  Failed to pull ${image}: ${pullError.message}`);
        return { image, status: "failed", error: pullError.message };
      }
    }
  });

  // Wait for all pulls to complete in parallel
  const results = await Promise.allSettled(pullPromises);

  const pulled = results.filter((r) => r.status === "fulfilled" && r.value.status === "pulled").length;
  const failed = results.filter((r) => r.status === "fulfilled" && r.value.status === "failed").length;
  const cached = results.filter((r) => r.status === "fulfilled" && r.value.status === "already pulled").length;

  console.log(`  📊 Images: ${cached} cached, ${pulled} pulled, ${failed} failed`);
  console.log("✅ Docker image check complete");
}

module.exports = { runCode, getLanguages, ensureImages, checkDocker, isDockerAvailable };
