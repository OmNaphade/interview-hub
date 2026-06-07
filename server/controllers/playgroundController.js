const { runCode, getLanguages, isDockerAvailable } = require("../services/dockerService");

// Execute code in Docker container
async function runCodeHandler(req, res) {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: "Language and code are required" });
  }

  if (!isDockerAvailable()) {
    return res.status(503).json({
      error: "Code execution is not available on this server. Playground requires Docker, which is only available in development."
    });
  }

  try {
    const result = await runCode(language, code);
    res.json(result);
  } catch (error) {
    console.error("❌ Playground error:", error.message);
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
}

// Get supported languages
function getLanguagesHandler(req, res) {
  res.json(getLanguages());
}

module.exports = { runCode: runCodeHandler, getLanguages: getLanguagesHandler };
