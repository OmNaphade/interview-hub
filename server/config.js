require("dotenv").config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

function parseInteger(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a valid integer`);
  }

  return parsed;
}

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function validateProductionEnv() {
  if (!isProduction) return;

  const required = ["DATABASE_URL", "AUTH_SECRET", "CORS_ORIGINS"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`
    );
  }

  if (process.env.AUTH_SECRET.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters in production");
  }
}

validateProductionEnv();

module.exports = {
  port: parseInteger("PORT", 5000),
  nodeEnv,
  isProduction,
  trustProxy: process.env.TRUST_PROXY === "true" || isProduction,
  cors: {
    origins: parseOrigins(process.env.CORS_ORIGINS),
  },
  auth: {
    allowPasswordAuth: process.env.ALLOW_PASSWORD_AUTH !== "false",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      callbackUrl:
        process.env.GITHUB_CALLBACK_URL ||
        "http://localhost:5173/api/auth/github/callback",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5173/api/auth/google/callback",
    },
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    apiKey: process.env.OLLAMA_API_KEY || "",
    chatModel: process.env.CHAT_MODEL || "llama3",
    embedModel: process.env.EMBED_MODEL || "nomic-embed-text",
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  datafiles: {
    path: process.env.DATAFILES_PATH || "./datafiles",
  },
  rag: {
    chunkSize: parseInteger("CHUNK_SIZE", 500),
    chunkOverlap: parseInteger("CHUNK_OVERLAP", 50),
    topK: parseInteger("TOP_K_CHUNKS", 5),
  },
};
