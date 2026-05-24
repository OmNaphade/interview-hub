const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  const status = err.message === "Origin not allowed by CORS" ? 403 : err.status || 500;
  const isProduction = process.env.NODE_ENV === "production";
  const message =
    status === 500 && isProduction
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

  res.status(status).json({
    error: {
      status,
      message,
      ...(!isProduction && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
