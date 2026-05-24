process.env.NODE_ENV = "test";
process.env.AUTH_SECRET = "test-secret-that-is-longer-than-32-characters";
process.env.ALLOW_PASSWORD_AUTH = "true";
process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const test = require("node:test");

const users = new Map();
const sessions = new Map();
const messages = new Map();

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

function resetData() {
  users.clear();
  sessions.clear();
  messages.clear();
}

function sessionWithMessages(session, order = "asc", take = undefined) {
  let sessionMessages = [...messages.values()]
    .filter((message) => message.sessionId === session.id)
    .sort((a, b) => a.createdAt - b.createdAt);

  if (order === "desc") {
    sessionMessages = sessionMessages.reverse();
  }

  if (take) {
    sessionMessages = sessionMessages.slice(0, take);
  }

  return { ...session, messages: sessionMessages };
}

const prisma = {
  user: {
    async findUnique({ where, select }) {
      const user = where.email
        ? [...users.values()].find((item) => item.email === where.email)
        : users.get(where.id);

      if (!user) return null;
      if (!select) return user;

      return Object.fromEntries(
        Object.entries(select)
          .filter(([, enabled]) => enabled)
          .map(([key]) => [key, user[key]])
      );
    },
    async create({ data }) {
      const user = {
        id: crypto.randomUUID(),
        email: data.email,
        name: data.name || null,
        passwordHash: data.passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      users.set(user.id, user);
      return user;
    },
  },
  question: {
    async findMany() {
      return [];
    },
    async findFirst() {
      return null;
    },
  },
  chatSession: {
    async findMany({ where }) {
      return [...sessions.values()]
        .filter((session) => session.userId === where.userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((session) => sessionWithMessages(session, "desc", 1));
    },
    async findFirst({ where, include }) {
      const session = [...sessions.values()].find(
        (item) => item.id === where.id && item.userId === where.userId
      );
      if (!session) return null;
      if (!include?.messages) return session;
      return sessionWithMessages(session, include.messages.orderBy?.createdAt);
    },
    async create({ data }) {
      const session = {
        id: crypto.randomUUID(),
        title: data.title || "New Chat",
        mode: data.mode || "general",
        model: data.model || "llama3",
        userId: data.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      sessions.set(session.id, session);
      return session;
    },
    async deleteMany({ where }) {
      const session = sessions.get(where.id);
      if (session?.userId === where.userId) {
        sessions.delete(where.id);
      }
      return { count: session ? 1 : 0 };
    },
  },
  message: {
    async create({ data }) {
      const message = {
        id: crypto.randomUUID(),
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        sources: data.sources || null,
        createdAt: new Date(),
      };
      messages.set(message.id, message);
      return message;
    },
  },
  async $queryRaw() {
    return [{ "?column?": 1 }];
  },
  async $disconnect() {},
};

require.cache[require.resolve("../prisma/client")] = {
  id: require.resolve("../prisma/client"),
  filename: require.resolve("../prisma/client"),
  loaded: true,
  exports: { prisma },
};

require.cache[require.resolve("../services/ollamaService")] = {
  id: require.resolve("../services/ollamaService"),
  filename: require.resolve("../services/ollamaService"),
  loaded: true,
  exports: {
    chat: async () => "mocked ai response",
    ping: async () => true,
    streamChat: async (res) => {
      res.write(`data: ${JSON.stringify({ token: "mocked stream" })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    },
  },
};

const { createApp } = require("../app");

async function withServer(fn) {
  const server = http.createServer(createApp());

  await new Promise((resolve) => server.listen(0, resolve));

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0];
}

test("public health, status, auth config, and questions endpoints respond", async () => {
  resetData();

  await withServer(async (baseUrl) => {
    let result = await request(baseUrl, "/health");
    assert.equal(result.response.status, 200);
    assert.equal(result.body.status, "ok");

    result = await request(baseUrl, "/api/status");
    assert.equal(result.response.status, 200);
    assert.equal(result.body.status, "ok");
    assert.equal(result.body.ollama, "running");
    assert.equal(result.body.database, "connected");

    result = await request(baseUrl, "/api/auth/config");
    assert.equal(result.response.status, 200);
    assert.equal(result.body.passwordAuth, true);

    result = await request(baseUrl, "/api/questions/javascript");
    assert.equal(result.response.status, 200);
    assert.equal(Array.isArray(result.body), true);
    assert.equal(result.body.length > 0, true);

    result = await request(baseUrl, "/api/questions/javascript/missing-id");
    assert.equal(result.response.status, 404);
    assert.equal(result.body.error, "Question not found");
  });
});

test("password auth creates a secure cookie-backed session", async () => {
  resetData();

  await withServer(async (baseUrl) => {
    let result = await request(baseUrl, "/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "User@Example.com",
        name: "User",
        password: "password123",
      }),
    });

    assert.equal(result.response.status, 201);
    assert.equal(result.body.user.email, "user@example.com");

    const signupCookie = cookieFrom(result.response);
    assert.match(signupCookie, /^ih_token=/);

    result = await request(baseUrl, "/api/auth/me", {
      headers: { Cookie: signupCookie },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.user.email, "user@example.com");
    assert.match(cookieFrom(result.response), /^ih_token=/);

    result = await request(baseUrl, "/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        password: "password123",
      }),
    });
    assert.equal(result.response.status, 409);

    result = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        password: "wrong-password",
      }),
    });
    assert.equal(result.response.status, 401);

    result = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        password: "password123",
      }),
    });
    assert.equal(result.response.status, 200);
    assert.match(cookieFrom(result.response), /^ih_token=/);

    result = await request(baseUrl, "/api/auth/logout", {
      method: "POST",
      headers: { Cookie: signupCookie },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.message, "Logged out");
  });
});

test("protected API groups require authentication", async () => {
  resetData();

  await withServer(async (baseUrl) => {
    const protectedRequests = [
      ["/api/auth/me", {}],
      ["/api/chat/sessions", {}],
      ["/api/interview/start", { method: "POST", body: "{}" }],
      ["/api/documents", {}],
      ["/api/progress", {}],
    ];

    for (const [path, options] of protectedRequests) {
      const result = await request(baseUrl, path, options);
      assert.equal(result.response.status, 401, path);
      assert.equal(result.body.error, "Authentication required");
    }
  });
});

test("authenticated chat APIs create, list, read, delete, and call AI helpers", async () => {
  resetData();

  await withServer(async (baseUrl) => {
    let result = await request(baseUrl, "/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "chat@example.com",
        password: "password123",
      }),
    });
    const cookie = cookieFrom(result.response);

    result = await request(baseUrl, "/api/chat/sessions", {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({ title: "Prep", mode: "interview" }),
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.title, "Prep");
    const sessionId = result.body.id;

    result = await request(baseUrl, "/api/chat/sessions", {
      headers: { Cookie: cookie },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.length, 1);

    result = await request(baseUrl, `/api/chat/sessions/${sessionId}`, {
      headers: { Cookie: cookie },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.id, sessionId);

    result = await request(baseUrl, "/api/chat/hint", {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({ code: "return 1", language: "javascript" }),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.hint, "mocked ai response");

    result = await request(baseUrl, "/api/chat/review", {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({ code: "return 1", language: "javascript" }),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.review, "mocked ai response");

    result = await request(baseUrl, `/api/chat/sessions/${sessionId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.message, "Session deleted");
  });
});
