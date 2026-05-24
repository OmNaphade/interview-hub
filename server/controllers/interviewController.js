const { prisma } = require("../prisma/client");
const { chat } = require("../services/ollamaService");

// Start new interview session
async function startInterview(req, res) {
  const { topic, difficulty, questionCount } = req.body;

  try {
    // Get questions for topic
    const questions = await prisma.question.findMany({
      where: {
        topic,
        difficulty,
        type: "theory",
      },
      take: questionCount || 5,
    });

    if (questions.length === 0) {
      return res.status(404).json({ error: "No questions found for topic" });
    }

    // Create interview session
    const session = await prisma.interviewSession.create({
      data: {
        userId: req.user.id,
        topic,
        difficulty,
        totalQuestions: questions.length,
        questionsData: questions.map((q) => ({
          questionId: q.id,
          questionText: q.questionText,
          userAnswer: null,
          aiScore: null,
          aiFeedback: null,
        })),
      },
    });

    res.status(201).json({
      sessionId: session.id,
      currentQuestion: {
        questionIndex: 0,
        question: questions[0].questionText,
        totalQuestions: questions.length,
      },
    });
  } catch (error) {
    console.error("❌ Start interview error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Submit answer and get next question
async function submitAnswer(req, res) {
  const { sessionId, questionIndex, userAnswer } = req.body;

  try {
    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user.id },
    });

    if (!session) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    const questionsData = session.questionsData;
    const currentQuestion = questionsData[questionIndex];

    // Score the answer using Ollama
    const systemPrompt = `You are an expert interviewer scoring a candidate's answer.
Score the answer on a scale of 1-10 based on:
- Correctness and completeness
- Clarity of explanation
- Problem-solving approach

Respond with JSON: { "score": <1-10>, "feedback": "brief feedback" }`;

    const response = await chat(
      [
        {
          role: "user",
          content: `Question: ${currentQuestion.questionText}\n\nCandidate's Answer: ${userAnswer}`,
        },
      ],
      systemPrompt
    );

    // Parse AI response
    let scoreData = { score: 5, feedback: "Good attempt" };
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scoreData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("⚠️ Could not parse AI score");
    }

    // Update question data
    questionsData[questionIndex] = {
      ...currentQuestion,
      userAnswer,
      aiScore: scoreData.score,
      aiFeedback: scoreData.feedback,
    };

    // Calculate overall score if all questions answered
    let overallScore = null;
    const allAnswered = questionsData.every((q) => q.userAnswer !== null);

    if (allAnswered) {
      overallScore = (
        questionsData.reduce((sum, q) => sum + (q.aiScore || 0), 0) /
        questionsData.length
      ).toFixed(1);
    }

    // Update session
    const updatedSession = await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        questionsData,
        overallScore: allAnswered ? parseFloat(overallScore) : null,
        completedAt: allAnswered ? new Date() : null,
      },
    });

    // Return next question or completion
    if (questionIndex + 1 < questionsData.length) {
      const nextQuestion = questionsData[questionIndex + 1];
      res.json({
        currentScore: scoreData.score,
        feedback: scoreData.feedback,
        nextQuestion: {
          questionIndex: questionIndex + 1,
          question: nextQuestion.questionText,
          totalQuestions: questionsData.length,
        },
      });
    } else {
      res.json({
        currentScore: scoreData.score,
        feedback: scoreData.feedback,
        completed: true,
        overallScore,
        sessionId,
      });
    }
  } catch (error) {
    console.error("❌ Submit answer error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Get interview session summary
async function getInterviewSummary(req, res) {
  const { sessionId } = req.params;

  try {
    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: req.user.id },
    });

    if (!session) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    // Calculate weak areas
    const questionsData = session.questionsData;
    const weakAreas = questionsData
      .filter((q) => q.aiScore < 5)
      .map((q) => q.questionText);

    res.json({
      ...session,
      weakAreas,
    });
  } catch (error) {
    console.error("❌ Get summary error:", error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  startInterview,
  submitAnswer,
  getInterviewSummary,
};
