const { prisma } = require("../prisma/client");
const fs = require("fs");
const path = require("path");

function readBuiltinQuestions(topic) {
  const jsonPath = path.join(__dirname, `../data/questions/${topic}.json`);
  if (!fs.existsSync(jsonPath)) return [];

  return JSON.parse(fs.readFileSync(jsonPath, "utf-8")).map((question, index) => ({
    id: question.id || `builtin-${topic}-${index}`,
    source: question.source || "builtin",
    type: question.type || "theory",
    ...question,
  }));
}

// Get all questions for a topic
async function getQuestionsByTopic(req, res) {
  const { topic } = req.params;
  const { difficulty, type } = req.query;

  try {
    const where = { topic };
    if (difficulty) where.difficulty = difficulty;
    if (type) where.type = type;

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const builtinQuestions = readBuiltinQuestions(topic).filter((question) => {
      if (difficulty && question.difficulty !== difficulty) return false;
      if (type && question.type !== type) return false;
      return true;
    });

    res.json([...questions, ...builtinQuestions]);
  } catch (error) {
    console.error("❌ Get questions error:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
}

// Get single question
async function getQuestion(req, res) {
  const { topic, questionId } = req.params;

  try {
    const question = await prisma.question.findFirst({
      where: { id: questionId, topic },
    });

    if (!question && questionId.startsWith("builtin-")) {
      const builtin = readBuiltinQuestions(topic).find((item) => item.id === questionId);
      if (builtin) return res.json(builtin);
    }

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json(question);
  } catch (error) {
    console.error("❌ Get question error:", error);
    res.status(500).json({ error: "Failed to fetch question" });
  }
}

async function getRoadmapByTopic(req, res) {
  const { topic } = req.params;

  const items = await prisma.roadmapItem.findMany({
    where: { topic },
    orderBy: { order: "asc" },
  });

  res.json(items);
}

module.exports = {
  getQuestionsByTopic,
  getQuestion,
  getRoadmapByTopic,
};
