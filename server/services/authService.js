const crypto = require("crypto");

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const COOKIE_NAME = "ih_token";

function getSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production");
  }

  return "dev-only-change-me";
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(data) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64url");
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;

  const hash = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHash, "base64url");

  return stored.length === hash.length && crypto.timingSafeEqual(stored, hash);
}

function createToken(user) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    })
  );
  const signature = sign(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  try {
    if (!token) return null;

    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;

    const expected = sign(`${header}.${payload}`);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;

    return data;
  } catch (error) {
    return null;
  }
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return parseCookies(req)[COOKIE_NAME];
}

function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === "production";

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: "/",
  });
}

function clearAuthCookie(res) {
  const secure = process.env.NODE_ENV === "production";

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  getTokenFromRequest,
  setAuthCookie,
  clearAuthCookie,
  publicUser,
};
