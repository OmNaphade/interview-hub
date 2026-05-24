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
const resetTokens = new Map();
const questions = new Map();
const roadmapItems = new Map();
const progressItems = new Map();

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
  resetTokens.clear();
  questions.clear();
  roadmapItems.clear();
  progressItems.clear();
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
    async findMany() {
      return [...users.values()].sort((a, b) => b.createdAt - a.createdAt);
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
    async update({ where, data }) {
      const user = users.get(where.id);
      if (!user) throw new Error("User not found");
      const updated = { ...user, ...data, updatedAt: new Date() };
      users.set(where.id, updated);
      return updated;
    },
    async delete({ where }) {
      const user = users.get(where.id);
      if (!user) throw new Error("User not found");
      users.delete(where.id);
      return user;
    },
  },
  question: {
    async findMany({ where = {} } = {}) {
      return [...questions.values()].filter((question) => {
        if (where.topic && question.topic !== where.topic) return false;
        if (where.difficulty && question.difficulty !== where.difficulty) return false;
        if (where.type && question.type !== where.type) return false;
        return true;
      });
    },
    async findFirst({ where }) {
      return [...questions.values()].find(
        (question) => question.id === where.id && question.topic === where.topic
      ) || null;
    },
    async create({ data }) {
      const question = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
      questions.set(question.id, question);
      return question;
    },
    async update({ where, data }) {
      const question = questions.get(where.id);
      if (!question) throw new Error("Question not found");
      const updated = { ...question, ...data };
      questions.set(where.id, updated);
      return updated;
    },
    async delete({ where }) {
      const question = questions.get(where.id);
      if (!question) throw new Error("Question not found");
      questions.delete(where.id);
      return question;
    },
  },
  passwordResetToken: {
    async create({ data }) {
      const record = { id: crypto.randomUUID(), createdAt: new Date(), usedAt: null, ...data };
      resetTokens.set(record.tokenHash, record);
      return record;
    },
    async findUnique({ where }) {
      if (where.tokenHash) return resetTokens.get(where.tokenHash) || null;
      return [...resetTokens.values()].find((item) => item.id === where.id) || null;
    },
    async update({ where, data }) {
      const record = [...resetTokens.values()].find((item) => item.id === where.id);
      if (!record) throw new Error("Reset token not found");
      const updated = { ...record, ...data };
      resetTokens.delete(record.tokenHash);
      resetTokens.set(updated.tokenHash, updated);
      return updated;
    },
  },
  roadmapItem: {
    async findMany({ where = {} } = {}) {
      return [...roadmapItems.values()]
        .filter((item) => !where.topic || item.topic === where.topic)
        .sort((a, b) => a.order - b.order);
    },
    async create({ data }) {
      const item = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
      roadmapItems.set(item.id, item);
      return item;
    },
    async update({ where, data }) {
      const item = roadmapItems.get(where.id);
      if (!item) throw new Error("Roadmap item not found");
      const updated = { ...item, ...data, updatedAt: new Date() };
      roadmapItems.set(where.id, updated);
      return updated;
    },
    async delete({ where }) {
      const item = roadmapItems.get(where.id);
      if (!item) throw new Error("Roadmap item not found");
      roadmapItems.delete(where.id);
      return item;
    },
  },
  topicProgress: {
    async findMany({ where = {} } = {}) {
      return [...progressItems.values()]
        .filter((item) => {
          if (where.userId && item.userId !== where.userId) return false;
          if (where.topic && item.topic !== where.topic) return false;
          return true;
        })
        .map((item) => ({
          ...item,
          user: users.get(item.userId)
            ? {
                id: item.userId,
                email: users.get(item.userId).email,
                name: users.get(item.userId).name,
              }
            : undefined,
        }));
    },
    async upsert({ where, update, create }) {
      const key = `${where.userId_topic_stepName.userId}:${where.userId_topic_stepName.topic}:${where.userId_topic_stepName.stepName}`;
      const existing = [...progressItems.values()].find(
        (item) => `${item.userId}:${item.topic}:${item.stepName}` === key
      );
      if (existing) {
        const updated = { ...existing, ...update, updatedAt: new Date() };
        progressItems.set(updated.id, updated);
        return updated;
      }
      const item = { id: crypto.randomUUID(), updatedAt: new Date(), ...create };
      progressItems.set(item.id, item);
      return item;
    },
    async delete({ where }) {
      const item = progressItems.get(where.id);
      if (!item) throw new Error("Progress not found");
      progressItems.delete(where.id);
      return item;
    },
    async deleteMany({ where }) {
      const targets = [...progressItems.values()].filter((item) => item.userId === where.userId);
      targets.forEach((item) => progressItems.delete(item.id));
      return { count: targets.length };
    },
    async count() {
      return progressItems.size;
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
  document: {
    async count() {
      return 0;
    },
  },
  interviewSession: {
    async count() {
      return 0;
    },
  },
  async $queryRaw() {
    return [{ "?column?": 1 }];
  },
  async $disconnect() {},
};

for (const modelName of ["user", "question", "roadmapItem", "chatSession"]) {
  const model = prisma[modelName];
  model.count = async () => {
    if (modelName === "user") return users.size;
    if (modelName === "question") return questions.size;
    if (modelName === "roadmapItem") return roadmapItems.size;
    if (modelName === "chatSession") return sessions.size;
    return 0;
  };
}

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
    assert.equal(result.body.user.isAdmin, false);

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

test("profile update, password change, and password reset work", async () => {
  resetData();

  await withServer(async (baseUrl) => {
    let result = await request(baseUrl, "/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "profile@example.com",
        name: "Old",
        password: "password123",
      }),
    });
    const cookie = cookieFrom(result.response);

    result = await request(baseUrl, "/api/auth/me", {
      method: "PUT",
      headers: { Cookie: cookie },
      body: JSON.stringify({ name: "New Name" }),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.user.name, "New Name");

    result = await request(baseUrl, "/api/auth/password", {
      method: "PUT",
      headers: { Cookie: cookie },
      body: JSON.stringify({ currentPassword: "wrong", newPassword: "newpassword123" }),
    });
    assert.equal(result.response.status, 401);

    result = await request(baseUrl, "/api/auth/password", {
      method: "PUT",
      headers: { Cookie: cookie },
      body: JSON.stringify({ currentPassword: "password123", newPassword: "newpassword123" }),
    });
    assert.equal(result.response.status, 200);

    result = await request(baseUrl, "/api/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email: "profile@example.com" }),
    });
    assert.equal(result.response.status, 200);
    assert.equal(Boolean(result.body.resetToken), true);

    result = await request(baseUrl, "/api/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token: result.body.resetToken, newPassword: "resetpassword123" }),
    });
    assert.equal(result.response.status, 200);

    result = await request(baseUrl, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "profile@example.com", password: "resetpassword123" }),
    });
    assert.equal(result.response.status, 200);
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

test("admin APIs are restricted and allow content management for configured admins", async () => {
  resetData();

  await withServer(async (baseUrl) => {
    let result = await request(baseUrl, "/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "normal@example.com",
        password: "password123",
      }),
    });
    const normalCookie = cookieFrom(result.response);

    result = await request(baseUrl, "/api/admin/questions", {
      method: "POST",
      headers: { Cookie: normalCookie },
      body: JSON.stringify({
        topic: "dsa",
        type: "theory",
        difficulty: "easy",
        questionText: "What is a stack?",
        answerText: "LIFO",
      }),
    });
    assert.equal(result.response.status, 403);

    result = await request(baseUrl, "/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "masteroman1234@gmail.com",
        password: "password123",
      }),
    });
    const adminCookie = cookieFrom(result.response);
    assert.equal(result.body.user.isAdmin, true);

    result = await request(baseUrl, "/api/progress/dsa/theory", {
      method: "PUT",
      headers: { Cookie: normalCookie },
      body: JSON.stringify({ status: "done" }),
    });
    assert.equal(result.response.status, 200);
    const progressId = result.body.id;

    result = await request(baseUrl, "/api/admin/dashboard", {
      headers: { Cookie: adminCookie },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.counts.users, 2);
    assert.equal(result.body.counts.progressItems, 1);

    result = await request(baseUrl, "/api/admin/users", {
      headers: { Cookie: adminCookie },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.length, 2);

    result = await request(baseUrl, "/api/admin/progress", {
      headers: { Cookie: adminCookie },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body[0].id, progressId);

    result = await request(baseUrl, `/api/admin/progress/${progressId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert.equal(result.response.status, 200);

    result = await request(baseUrl, "/api/progress/dsa/coding", {
      method: "PUT",
      headers: { Cookie: normalCookie },
      body: JSON.stringify({ status: "done" }),
    });
    assert.equal(result.response.status, 200);

    result = await request(baseUrl, `/api/admin/users/${users.values().next().value.id}/progress`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert.equal(result.response.status, 200);

    result = await request(baseUrl, "/api/admin/questions", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        topic: "dsa",
        type: "coding",
        difficulty: "medium",
        questionText: "Reverse an array",
        answerText: "Use two pointers",
        starterCode: "function reverse(items) {}",
      }),
    });
    assert.equal(result.response.status, 201);
    const questionId = result.body.id;

    result = await request(baseUrl, "/api/admin/questions", {
      headers: { Cookie: adminCookie },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.some((question) => question.id === questionId), true);

    result = await request(baseUrl, "/api/questions/dsa?type=coding");
    assert.equal(result.response.status, 200);
    assert.equal(result.body.some((question) => question.id === questionId), true);

    result = await request(baseUrl, "/api/admin/roadmap", {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        topic: "dsa",
        title: "Arrays",
        description: "Start with traversal and two pointers.",
        order: 1,
      }),
    });
    assert.equal(result.response.status, 201);

    result = await request(baseUrl, "/api/questions/dsa/roadmap");
    assert.equal(result.response.status, 200);
    assert.equal(result.body[0].title, "Arrays");

    const roadmapId = result.body[0].id;
    result = await request(baseUrl, `/api/admin/roadmap/${roadmapId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert.equal(result.response.status, 200);
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
