const config = require("../config");

function requireAdmin(req, res, next) {
  const email = String(req.user?.email || "").toLowerCase();

  if (!email || !config.auth.adminEmails.includes(email)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

module.exports = { requireAdmin };
