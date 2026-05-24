require("dotenv").config();

const config = require("./config");
const { prisma } = require("./prisma/client");
const { createApp } = require("./app");

const PORT = config.port;
const app = createApp();

const server = app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Ollama: ${config.ollama.baseUrl}`);

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database: connected");
  } catch (error) {
    console.log("Database: disconnected");
    console.log(`Database error: ${error.message}`);
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the existing server or set a different PORT in .env.`
    );
    process.exit(1);
  }

  throw error;
});

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down server...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error(`Database disconnect error: ${error.message}`);
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
