// Custom application error with status code
class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Centralized error handler middleware
function errorHandler(err, req, res, next) {
  // Log the error
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
    ...(err.isOperational ? {} : { stack: err.stack }),
  });

  // Handle known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Handle Prisma errors
  if (err.code && err.code.startsWith("P")) {
    return handlePrismaError(err, res);
  }

  // Handle validation errors
  if (err.name === "ValidationError" || err.name === "SyntaxError") {
    return res.status(400).json({ error: err.message });
  }

  // Handle JSON parse errors
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }

  // Handle network/timeout errors
  if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
    return res.status(503).json({ error: "External service unavailable. Please try again." });
  }

  // Handle Docker not running
  if (err.message && err.message.includes("Cannot connect to the Docker daemon")) {
    return res.status(503).json({ error: "Docker is not running. Please start Docker Desktop." });
  }

  // Default 500 for unexpected errors
  const isProduction = process.env.NODE_ENV === "production";
  res.status(500).json({
    error: isProduction ? "Internal server error" : err.message || "Internal server error",
  });
}

function handlePrismaError(err, res) {
  switch (err.code) {
    case "P2002":
      return res.status(409).json({ error: "A record with this value already exists" });
    case "P2025":
      return res.status(404).json({ error: "Record not found" });
    case "P1001":
      return res.status(503).json({ error: "Cannot connect to database. Please try again." });
    case "P1003":
      return res.status(500).json({ error: "Database table does not exist. Run migrations." });
    case "P2003":
      return res.status(400).json({ error: "Referenced record does not exist" });
    case "P2014":
      return res.status(400).json({ error: "Required relation violation" });
    default:
      return res.status(500).json({ error: `Database error: ${err.message}` });
  }
}

module.exports = { errorHandler, AppError };
