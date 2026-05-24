const { ping } = require("../services/ollamaService");
const { prisma } = require("../prisma/client");

// Health check
async function pingStatus(req, res) {
  try {
    const ollamaRunning = await ping();
    let dbConnected = true;

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbConnected = false;
    }

    res.json({
      status: ollamaRunning && dbConnected ? "ok" : "degraded",
      ollama: ollamaRunning ? "running" : "offline",
      database: dbConnected ? "connected" : "disconnected",
    });
  } catch (error) {
    console.error("❌ Status check error:", error);
    res.json({
      status: "error",
      error: error.message,
    });
  }
}

module.exports = { pingStatus };
