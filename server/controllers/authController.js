const { prisma } = require("../prisma/client");
const crypto = require("crypto");
const config = require("../config");
const {
  hashPassword,
  hashResetToken,
  verifyPassword,
  createToken,
  setAuthCookie,
  clearAuthCookie,
  publicUser,
} = require("../services/authService");
const {
  clearStateCookie,
  clearReturnToCookie,
  githubAuthUrl,
  getReturnTo,
  getGithubProfile,
  googleAuthUrl,
  getGoogleProfile,
  setStateCookie,
  setReturnToCookie,
  verifyState,
} = require("../services/oauthService");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function adminFlag(user) {
  return config.auth.adminEmails.includes(String(user.email || "").toLowerCase());
}

function publicUserWithRole(user) {
  return {
    ...publicUser(user),
    isAdmin: adminFlag(user),
  };
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

  res.status(201).json({ user: publicUserWithRole(user) });
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

  res.json({ user: publicUserWithRole(user) });
}

async function logout(req, res) {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
}

async function me(req, res) {
  setAuthCookie(res, createToken(req.user));
  res.json({ user: publicUserWithRole(req.user) });
}

async function updateProfile(req, res) {
  const name = String(req.body.name || "").trim() || null;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name },
  });

  res.json({ user: publicUserWithRole(user) });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!validatePassword(newPassword)) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !verifyPassword(currentPassword || "", user.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  res.json({ message: "Password changed" });
}

async function requestPasswordReset(req, res) {
  const email = normalizeEmail(req.body.email);
  const user = await prisma.user.findUnique({ where: { email } });

  let resetToken = null;
  if (user) {
    resetToken = crypto.randomBytes(32).toString("base64url");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(resetToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  }

  const response = {
    message: "If an account exists, a password reset link will be sent.",
  };

  if (!config.isProduction && resetToken) {
    response.resetToken = resetToken;
  }

  res.json(response);
}

async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Reset token is required" });
  }

  if (!validatePassword(newPassword)) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json({ error: "Reset token is invalid or expired" });
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash: hashPassword(newPassword) },
  });

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  res.json({ message: "Password reset complete" });
}

function redirectAfterOAuth(req, res, success = true) {
  const target = new URL(config.auth.frontendUrl);
  target.pathname = success ? getReturnTo(req) : "/login";
  if (!success) target.searchParams.set("error", "oauth_failed");
  clearReturnToCookie(res);
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
  setReturnToCookie(res, req.query.returnTo);
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
    redirectAfterOAuth(req, res);
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    clearStateCookie(res);
    redirectAfterOAuth(req, res, false);
  }
}

function startGoogle(req, res) {
  if (!config.auth.google.clientId || !config.auth.google.clientSecret) {
    return res.status(503).json({ error: "Google OAuth is not configured" });
  }

  const auth = googleAuthUrl();
  setStateCookie(res, auth.state);
  setReturnToCookie(res, req.query.returnTo);
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
    redirectAfterOAuth(req, res);
  } catch (error) {
    console.error("Google OAuth error:", error);
    clearStateCookie(res);
    redirectAfterOAuth(req, res, false);
  }
}

function authConfig(req, res) {
  res.json({
    passwordAuth: config.auth.allowPasswordAuth,
    github: Boolean(config.auth.github.clientId && config.auth.github.clientSecret),
    google: Boolean(config.auth.google.clientId && config.auth.google.clientSecret),
    adminEmails: config.isProduction ? undefined : config.auth.adminEmails,
  });
}

module.exports = {
  authConfig,
  githubCallback,
  googleCallback,
  login,
  logout,
  me,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  signup,
  startGithub,
  startGoogle,
};
