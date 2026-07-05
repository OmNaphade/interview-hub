const { prisma } = require("../prisma/client");
const config = require("../config");
const { streamChat, chat } = require("../services/groqService");
const {
  getRelevantChunks,
  buildRAGPrompt,
  formatChunkCitations,
} = require("../services/ragService");

// Get all chat sessions
async function getSessions(req, res) {
  const sessions = await prisma.chatSession.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  res.json(sessions);
}

// Get single session with all messages
async function getSessionMessages(req, res) {
  const { sessionId } = req.params;

  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: req.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json(session);
}

// Create new chat session
async function createSession(req, res) {
  const { title, mode, model } = req.body;

  const session = await prisma.chatSession.create({
    data: {
      title: title || "New Chat",
      mode: mode || "general",
      model: model || config.groq.chatModel,
      userId: req.user.id,
    },
  });

  res.status(201).json(session);
}

// Delete chat session
async function deleteSession(req, res) {
  const { sessionId } = req.params;

  await prisma.chatSession.deleteMany({
    where: { id: sessionId, userId: req.user.id },
  });

  res.json({ message: "Session deleted" });
}

// Stream chat message
async function streamMessage(req, res) {
  const { sessionId, message, mode } = req.body || {};

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "Valid sessionId is required" });
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // Get session with history
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: req.user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 20,
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Save user message
    await prisma.message.create({
      data: {
        sessionId,
        role: "user",
        content: message.trim(),
      },
    });

    // Build message history for GROQ
    const messages = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    messages.push({ role: "user", content: message.trim() });

    // Build system prompt based on mode
    let systemPrompt = "";
    let ragChunks = [];

    if (mode === "rag") {
      ragChunks = await getRelevantChunks(message.trim(), 5, req.user.id);
      systemPrompt = buildRAGPrompt(ragChunks, message.trim());
    } else {
      systemPrompt = buildSystemPrompt(mode);
    }

    // Stream response
    let fullResponse = "";

    res.on("finish", async () => {
      if (!fullResponse.trim()) return;

      await prisma.message.create({
        data: {
          sessionId,
          role: "assistant",
          content: fullResponse,
          sources: mode === "rag" ? formatChunkCitations(ragChunks) : null,
        },
      });
    });

    // Custom stream handler to capture full response
    const originalWrite = res.write.bind(res);
    res.write = function (chunk) {
      if (typeof chunk === "string" && chunk.startsWith("data:")) {
        const dataMatch = chunk.match(/data: ({.*})/);
        if (dataMatch) {
          try {
            const data = JSON.parse(dataMatch[1]);
            if (data.token) {
              fullResponse += data.token;
            }
          } catch (e) {}
        }
      }
      return originalWrite(chunk);
    };

    await streamChat(res, messages, systemPrompt, session.model || config.groq.chatModel);
  } catch (error) {
    console.error("❌ Stream message error:", error);
    res.status(500).json({ error: "Failed to stream chat response" });
  }
}

// Get coding hint
async function getHint(req, res) {
  const { code, language } = req.body;

  try {
    const systemPrompt = `You are a helpful coding tutor.
Provide a brief hint (2-3 sentences) to help the user solve the problem.
Focus on the algorithm or approach, not the solution.

Language: ${language}`;

    const response = await chat(
      [{ role: "user", content: code }],
      systemPrompt
    );

    res.json({ hint: response });
  } catch (error) {
    console.error("❌ Hint error:", error);
    res.status(500).json({ error: "Failed to generate hint" });
  }
}

// Get code review
async function getCodeReview(req, res) {
  const { code, language } = req.body;

  try {
    const systemPrompt = `You are an expert code reviewer.
Review the provided ${language} code for:
1. Correctness and logic
2. Efficiency (time/space complexity if applicable)
3. Best practices and readability
4. Potential bugs or edge cases

Provide concise, actionable feedback.`;

    const response = await chat(
      [{ role: "user", content: code }],
      systemPrompt
    );

    res.json({ review: response });
  } catch (error) {
    console.error("❌ Review error:", error);
    res.status(500).json({ error: "Failed to generate code review" });
  }
}

// Build system prompt based on chat mode
function buildSystemPrompt(mode) {
  const prompts = {
    general:
      "You are a helpful AI assistant. Answer directly and concisely. For greetings, reply with one short friendly sentence. Do not invent a long explanation unless the user asks for one.",
    code: "You are an expert programming assistant. Help with code, debugging, and best practices. Be concise. Format code with proper syntax highlighting.",
    interview:
      "You are an interview coach. Provide coaching-style feedback, structure your answers clearly, and suggest improvements. Be encouraging but honest.",
    eli5: "Explain concepts like you're talking to a beginner. Use simple language, analogies, and avoid jargon. Make it fun and engaging.",
    rag: "You are a helpful AI assistant using provided reference material.",
  };

  return prompts[mode] || prompts.general;
}

module.exports = {
  getSessions,
  getSessionMessages,
  createSession,
  deleteSession,
  streamMessage,
  getHint,
  getCodeReview,
};
