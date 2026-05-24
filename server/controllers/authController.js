const { prisma } = require("../prisma/client");
const {
  hashPassword,
  verifyPassword,
  createToken,
  setAuthCookie,
  clearAuthCookie,
  publicUser,
} = require("../services/authService");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 8;
}

async function signup(req, res) {
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

module.exports = { signup, login, logout, me };
