const { prisma } = require("../prisma/client");
const crypto = require("crypto");
const config = require("../config");
const {
  hashPassword,
  verifyPassword,
  createToken,
  setAuthCookie,
  clearAuthCookie,
  publicUser,
} = require("../services/authService");
const {
  clearStateCookie,
  githubAuthUrl,
  getGithubProfile,
  googleAuthUrl,
  getGoogleProfile,
  setStateCookie,
  verifyState,
} = require("../services/oauthService");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 8;
}

async function signup(req, res) {
  if (!config.auth.allowPasswordAuth) {
    return res.status(403).json({ error: "Password signup is disabled" });
  }

  const email = normalizeEmail(req.body.email);
  const name = String(req.body.name || "").trim() || null;
  const { password } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: hashPassword(password),
    },
  });

  const token = createToken(user);
  setAuthCookie(res, token);

  res.status(201).json({ user: publicUser(user) });
}

async function login(req, res) {
  if (!config.auth.allowPasswordAuth) {
    return res.status(403).json({ error: "Password login is disabled" });
  }

  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password || "", user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = createToken(user);
  setAuthCookie(res, token);

  res.json({ user: publicUser(user) });
}

async function logout(req, res) {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
}

async function me(req, res) {
  res.json({ user: req.user });
}

function redirectAfterOAuth(res, success = true) {
  const target = new URL(config.auth.frontendUrl);
  target.pathname = success ? "/dashboard" : "/login";
  if (!success) target.searchParams.set("error", "oauth_failed");
  res.redirect(target.toString());
}

async function findOrCreateOAuthUser({ email, name }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash: `oauth:${crypto.randomBytes(32).toString("base64url")}`,
    },
  });
}

function startGithub(req, res) {
  if (!config.auth.github.clientId || !config.auth.github.clientSecret) {
    return res.status(503).json({ error: "GitHub OAuth is not configured" });
  }

  const auth = githubAuthUrl();
  setStateCookie(res, auth.state);
  res.redirect(auth.url);
}

async function githubCallback(req, res) {
  try {
    if (!verifyState(req)) {
      return res.status(400).json({ error: "Invalid OAuth state" });
    }

    const profile = await getGithubProfile(req.query.code);
    const user = await findOrCreateOAuthUser(profile);
    const token = createToken(user);

    clearStateCookie(res);
    setAuthCookie(res, token);
    redirectAfterOAuth(res);
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    clearStateCookie(res);
    redirectAfterOAuth(res, false);
  }
}

function startGoogle(req, res) {
  if (!config.auth.google.clientId || !config.auth.google.clientSecret) {
    return res.status(503).json({ error: "Google OAuth is not configured" });
  }

  const auth = googleAuthUrl();
  setStateCookie(res, auth.state);
  res.redirect(auth.url);
}

async function googleCallback(req, res) {
  try {
    if (!verifyState(req)) {
      return res.status(400).json({ error: "Invalid OAuth state" });
    }

    const profile = await getGoogleProfile(req.query.code);
    const user = await findOrCreateOAuthUser(profile);
    const token = createToken(user);

    clearStateCookie(res);
    setAuthCookie(res, token);
    redirectAfterOAuth(res);
  } catch (error) {
    console.error("Google OAuth error:", error);
    clearStateCookie(res);
    redirectAfterOAuth(res, false);
  }
}

function authConfig(req, res) {
  res.json({
    passwordAuth: config.auth.allowPasswordAuth,
    github: Boolean(config.auth.github.clientId && config.auth.github.clientSecret),
    google: Boolean(config.auth.google.clientId && config.auth.google.clientSecret),
  });
}

module.exports = {
  authConfig,
  githubCallback,
  googleCallback,
  login,
  logout,
  me,
  signup,
  startGithub,
  startGoogle,
};
