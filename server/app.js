const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const config = require("./config");
const errorHandler = require("./middleware/errorHandler");

const chatRoutes = require("./routes/chat");
const questionRoutes = require("./routes/questions");
const interviewRoutes = require("./routes/interview");
const documentRoutes = require("./routes/documents");
const progressRoutes = require("./routes/progress");
const statusRoutes = require("./routes/status");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

function createApp() {
  const app = express();

  if (config.trustProxy) {
    app.set("trust proxy", 1);
  }

  const corsOptions = {
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (!config.isProduction && config.cors.origins.length === 0) {
        return callback(null, true);
      }

      if (config.cors.origins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
  };

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.isProduction ? 300 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/health" || req.path.startsWith("/api/status"),
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.isProduction ? 20 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts. Try again later." },
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: config.isProduction ? 30 : 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests. Try again shortly." },
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );
  app.use(cors(corsOptions));
  app.use("/api", apiLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/signup", authLimiter);
  app.use(["/api/chat", "/api/interview", "/api/documents"], aiLimiter);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/chat", chatRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/questions", questionRoutes);
  app.use("/api/interview", interviewRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/status", statusRoutes);
  app.use("/api/admin", adminRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
