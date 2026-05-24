const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");

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
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
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
