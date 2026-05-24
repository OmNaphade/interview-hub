const crypto = require("crypto");
const config = require("../config");

const STATE_COOKIE = "ih_oauth_state";

function createState() {
  return crypto.randomBytes(24).toString("base64url");
}

function setStateCookie(res, state) {
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    maxAge: 10 * 60 * 1000,
    path: "/",
  });
}

function clearStateCookie(res) {
  res.clearCookie(STATE_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: "/",
  });
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

function verifyState(req) {
  const expected = parseCookies(req)[STATE_COOKIE];
  const actual = String(req.query.state || "");
  return Boolean(expected && actual && expected === actual);
}

async function exchangeCode(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "OAuth token exchange failed");
  }

  return data.access_token;
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "interview-hub",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "OAuth profile fetch failed");
  }

  return data;
}

function githubAuthUrl() {
  const state = createState();
  const url = new URL("https://github.com/login/oauth/authorize");

  url.searchParams.set("client_id", config.auth.github.clientId);
  url.searchParams.set("redirect_uri", config.auth.github.callbackUrl);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);

  return { state, url: url.toString() };
}

async function getGithubProfile(code) {
  const token = await exchangeCode("https://github.com/login/oauth/access_token", {
    client_id: config.auth.github.clientId,
    client_secret: config.auth.github.clientSecret,
    code,
    redirect_uri: config.auth.github.callbackUrl,
  });

  const profile = await fetchJson("https://api.github.com/user", token);
  const emails = await fetchJson("https://api.github.com/user/emails", token);
  const email =
    emails.find((item) => item.primary && item.verified)?.email ||
    emails.find((item) => item.verified)?.email;

  if (!email) {
    throw new Error("GitHub account must have a verified email address");
  }

  return {
    email: email.toLowerCase(),
    name: profile.name || profile.login || null,
  };
}

function googleAuthUrl() {
  const state = createState();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", config.auth.google.clientId);
  url.searchParams.set("redirect_uri", config.auth.google.callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return { state, url: url.toString() };
}

async function getGoogleProfile(code) {
  const token = await exchangeCode("https://oauth2.googleapis.com/token", {
    client_id: config.auth.google.clientId,
    client_secret: config.auth.google.clientSecret,
    code,
    redirect_uri: config.auth.google.callbackUrl,
    grant_type: "authorization_code",
  });

  const profile = await fetchJson("https://openidconnect.googleapis.com/v1/userinfo", token);

  if (!profile.email || !profile.email_verified) {
    throw new Error("Google account must have a verified email address");
  }

  return {
    email: profile.email.toLowerCase(),
    name: profile.name || null,
  };
}

module.exports = {
  clearStateCookie,
  githubAuthUrl,
  getGithubProfile,
  googleAuthUrl,
  getGoogleProfile,
  setStateCookie,
  verifyState,
};
