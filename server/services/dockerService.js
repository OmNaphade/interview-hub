const { execSync, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { AppError } = require("../middleware/errorHandler");

const WORK_DIR = path.join(__dirname, "..", "datafiles", "playground");

let dockerAvailable = true; // optimistic — assume available until checked

async function checkDocker() {
  try {
    execSync("docker info", { timeout: 5000, stdio: "pipe" });
    dockerAvailable = true;
    console.log("✅ Docker available — playground execution enabled");
  } catch {
    dockerAvailable = false;
    console.log("⚠️  Docker not available — playground execution disabled");
  }
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
    dbEnv: { MYSQL_ROOT_PASSWORD: "playground", MYSQL_DATABASE: "playground" },
    dbPort: 3306,
    cliCommand: (c) => `docker exec ${c} mysql -uroot -pplayground playground -t -e`,
    memory: "256m", timeout: 120000,
  },
  postgresql: {
    id: "postgresql", label: "PostgreSQL", image: "postgres:16", ext: "sql",
    isDatabase: true,
    dbEnv: { POSTGRES_PASSWORD: "playground", POSTGRES_DB: "playground" },
    dbPort: 5432,
    cliCommand: (c) => `docker exec ${c} psql -U postgres -d playground -c`,
    memory: "256m", timeout: 120000,
  },
};

function ensureWorkDir() {
  if (!fs.existsSync(WORK_DIR)) {
    fs.mkdirSync(WORK_DIR, { recursive: true });
  }
}

async function runCode(language, code) {
  if (!language || !code) {
    throw new AppError(400, "Language and code are required");
  }

  if (!dockerAvailable) {
    throw new AppError(503, "Code execution is only available in development. Docker is required but not running on this server.");
  }

  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    throw new AppError(400, `Unsupported language: ${language}`);
  }

  // Validate code size
  if (code.length > 100000) {
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
      return await runDatabaseQuery(config, sessionId, sessionDir, filename);
    }
    return await runCodeContainer(config, sessionDir, filename);
  } catch (error) {
    return handleDockerError(sessionDir, error);
  } finally {
    cleanupDir(sessionDir);
  }
}

async function runCodeContainer(config, sessionDir, filename) {
  const cmd = [
    "docker run --rm",
    "--network none",
    `-m ${config.memory}`,
    "--cpus 1",
    "--ulimit nproc=64",
    "--ulimit nofile=64",
    `-v "${sessionDir}":/code:ro`,
    config.image,
    config.prepareCommand
      ? config.prepareCommand(filename)
      : config.runCommand(filename),
  ].join(" ");

  const output = execSync(cmd, {
    timeout: config.timeout,
    encoding: "utf-8",
    maxBuffer: 1024 * 1024,
  });

  return { output: output.trim(), error: false };
}

async function runDatabaseQuery(config, sessionId, sessionDir, filename) {
  const containerName = `playground-${config.id}-${sessionId}`;

  let containerCreated = false;

  try {
    // Start database container
    const envVars = Object.entries(config.dbEnv)
      .map(([k, v]) => `-e ${k}=${v}`)
      .join(" ");

    execSync(
      `docker run -d --name ${containerName} ${envVars} -m ${config.memory} ${config.image}`,
      { timeout: 60000, encoding: "utf-8", shell: true }
    );
    containerCreated = true;

    // Wait for database to be ready with polling
    const maxWait = config.timeout;
    const startTime = Date.now();
    let lastError = "";

    while (Date.now() - startTime < maxWait) {
      try {
        const checkCmd = config.id === "mysql"
          ? `docker exec ${containerName} mysqladmin ping -uroot -pplayground --silent`
          : `docker exec ${containerName} pg_isready -U postgres`;

        const result = execSync(checkCmd, { timeout: 5000, encoding: "utf-8" });
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
    const sql = fs.readFileSync(path.join(sessionDir, filename), "utf-8");
    if (!sql.trim()) {
      throw new Error("SQL query is empty");
    }

    const escapedSql = sql.replace(/"/g, '\\"').replace(/\n/g, " ");
    const isWin = process.platform === "win32";
    const suppressErr = isWin ? "2>nul" : "2>/dev/null";
    const execCmd = isWin
      ? `docker exec ${containerName} ${config.id === "mysql" ? "mysql -uroot -pplayground playground -t -e" : "psql -U postgres -d playground -c"} "${escapedSql}" ${suppressErr}`
      : `${config.cliCommand(containerName)} "${escapedSql}" ${suppressErr}`;

    const output = execSync(execCmd, { timeout: 30000, encoding: "utf-8", maxBuffer: 1024 * 1024 });

    return { output: output.trim(), error: false };
  } finally {
    // Always cleanup container if it was created
    if (containerCreated) {
      try {
        const killCmd = process.platform === "win32"
      ? `docker kill ${containerName} & docker rm ${containerName}`
      : `docker kill ${containerName} 2>/dev/null && docker rm ${containerName} 2>/dev/null`;
    execSync(killCmd, { timeout: 10000, shell: true });
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
