const { prisma } = require("../prisma/client");
const config = require("../config");
const { publicUser } = require("../services/authService");
const { getMonitoringSnapshot } = require("../services/monitoringService");

function adminFlag(user) {
  return config.auth.adminEmails.includes(String(user.email || "").toLowerCase());
}

function adminUser(user) {
  return {
    ...publicUser(user),
    isAdmin: adminFlag(user),
  };
}

async function dashboard(req, res) {
  const [
    users,
    questions,
    roadmapItems,
    progressItems,
    documents,
    chatSessions,
    interviews,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.question.count(),
    prisma.roadmapItem.count(),
    prisma.topicProgress.count(),
    prisma.document.count(),
    prisma.chatSession.count(),
    prisma.interviewSession.count(),
  ]);

  res.json({
    counts: {
      users,
      questions,
      roadmapItems,
      progressItems,
      documents,
      chatSessions,
      interviews,
    },
    adminEmails: config.auth.adminEmails,
  });
}

async function monitoring(req, res) {
  const window = String(req.query.window || "15m");
  const endpointKey = String(req.query.endpoint || "");
  res.json(getMonitoringSnapshot({ window, endpointKey }));
}

async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          progress: true,
          bookmarks: true,
          documents: true,
          chatSessions: true,
          interviews: true,
        },
      },
    },
  });

  res.json(users.map(adminUser));
}

async function deleteUser(req, res) {
  if (req.params.userId === req.user.id) {
    return res.status(400).json({ error: "You cannot delete your own admin account" });
  }

  await prisma.user.delete({ where: { id: req.params.userId } });

  res.json({ message: "User deleted" });
}

async function listProgress(req, res) {
  const userId = String(req.query.userId || "").trim();
  const topic = String(req.query.topic || "").trim().toLowerCase();
  const where = {
    ...(userId ? { userId } : {}),
    ...(topic ? { topic } : {}),
  };

  const progress = await prisma.topicProgress.findMany({
    where,
    orderBy: [{ topic: "asc" }, { stepName: "asc" }],
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  res.json(progress);
}

async function deleteProgress(req, res) {
  await prisma.topicProgress.delete({ where: { id: req.params.progressId } });

  res.json({ message: "Progress deleted" });
}

async function clearUserProgress(req, res) {
  const result = await prisma.topicProgress.deleteMany({
    where: { userId: req.params.userId },
  });

  res.json({ message: "User progress cleared", count: result.count });
}

async function listQuestions(req, res) {
  const topic = String(req.query.topic || "").trim().toLowerCase();
  const type = String(req.query.type || "").trim().toLowerCase();
  const where = {
    ...(topic ? { topic } : {}),
    ...(type ? { type } : {}),
  };

  const questions = await prisma.question.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  res.json(questions);
}

function questionPayload(body) {
  return {
    topic: String(body.topic || "").trim().toLowerCase(),
    questionText: String(body.questionText || "").trim(),
    answerText: String(body.answerText || "").trim(),
    difficulty: String(body.difficulty || "medium").trim().toLowerCase(),
    type: String(body.type || "theory").trim().toLowerCase(),
    source: String(body.source || "admin").trim(),
    starterCode: body.starterCode ? String(body.starterCode) : null,
    testCases: body.testCases || null,
  };
}

function validateQuestion(data) {
  if (!data.topic) return "Topic is required";
  if (!data.questionText) return "Question text is required";
  if (!data.answerText) return "Answer text is required";
  if (!["easy", "medium", "hard"].includes(data.difficulty)) return "Invalid difficulty";
  if (!["theory", "coding", "interview"].includes(data.type)) return "Invalid question type";
  return null;
}

async function createQuestion(req, res) {
  const data = questionPayload(req.body);
  const error = validateQuestion(data);
  if (error) return res.status(400).json({ error });

  const question = await prisma.question.create({
    data: {
      ...data,
      userId: req.user.id,
    },
  });

  res.status(201).json(question);
}

async function updateQuestion(req, res) {
  const data = questionPayload(req.body);
  const error = validateQuestion(data);
  if (error) return res.status(400).json({ error });

  const question = await prisma.question.update({
    where: { id: req.params.questionId },
    data,
  });

  res.json(question);
}

async function deleteQuestion(req, res) {
  await prisma.question.delete({
    where: { id: req.params.questionId },
  });

  res.json({ message: "Question deleted" });
}

async function listRoadmap(req, res) {
  const topic = String(req.query.topic || "").trim().toLowerCase();
  const where = topic ? { topic } : {};

  const items = await prisma.roadmapItem.findMany({
    where,
    orderBy: [{ topic: "asc" }, { order: "asc" }],
  });

  res.json(items);
}

async function createRoadmapItem(req, res) {
  const topic = String(req.body.topic || "").trim().toLowerCase();
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const order = Number.parseInt(req.body.order || "0", 10);

  if (!topic || !title || !description) {
    return res.status(400).json({ error: "Topic, title, and description are required" });
  }

  const item = await prisma.roadmapItem.create({
    data: { topic, title, description, order: Number.isNaN(order) ? 0 : order },
  });

  res.status(201).json(item);
}

async function updateRoadmapItem(req, res) {
  const topic = String(req.body.topic || "").trim().toLowerCase();
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const order = Number.parseInt(req.body.order || "0", 10);

  if (!topic || !title || !description) {
    return res.status(400).json({ error: "Topic, title, and description are required" });
  }

  const item = await prisma.roadmapItem.update({
    where: { id: req.params.itemId },
    data: { topic, title, description, order: Number.isNaN(order) ? 0 : order },
  });

  res.json(item);
}

async function deleteRoadmapItem(req, res) {
  await prisma.roadmapItem.delete({
    where: { id: req.params.itemId },
  });

  res.json({ message: "Roadmap item deleted" });
}

module.exports = {
  dashboard,
  monitoring,
  listUsers,
  deleteUser,
  listProgress,
  deleteProgress,
  clearUserProgress,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listRoadmap,
  createRoadmapItem,
  updateRoadmapItem,
  deleteRoadmapItem,
};
