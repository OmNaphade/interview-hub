const { prisma } = require("../prisma/client");
const fs = require("fs");
const path = require("path");

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

    // Fallback to JSON if database is empty
    if (questions.length === 0) {
      const jsonPath = path.join(
        __dirname,
        `../data/questions/${topic}.json`
      );
      if (fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        return res.json(jsonData);
      }
    }

    res.json(questions);
  } catch (error) {
    console.error("❌ Get questions error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Get single question
async function getQuestion(req, res) {
  const { topic, questionId } = req.params;

  try {
    const question = await prisma.question.findFirst({
      where: { id: questionId, topic },
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json(question);
  } catch (error) {
    console.error("❌ Get question error:", error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getQuestionsByTopic,
  getQuestion,
};
