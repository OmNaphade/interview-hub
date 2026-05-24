const { getEmbedding, ollamaHeaders, ollamaUrl } = require("./ollamaService");
const { prisma } = require("../prisma/client");
const config = require("../config");

// Process and store document chunks with embeddings
async function processAndStoreChunks(documentId, chunks, source, pageMap = {}) {
  try {
    const storedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const pageNum = pageMap[i] || null;

      console.log(`  Embedding chunk ${i + 1}/${chunks.length}...`);

      // Get embedding from Ollama
      const embedding = await getEmbedding(chunkText);

      // Store in database with embedding vector
      const chunk = await prisma.documentChunk.create({
        data: {
          documentId,
          chunkText,
          embedding,
          source,
          pageNum,
          chunkIndex: i,
        },
      });

      storedChunks.push(chunk);
    }

    console.log(`✅ Stored ${storedChunks.length} chunks for document`);
    return storedChunks;
  } catch (error) {
    console.error("❌ Embedding storage error:", error);
    throw error;
  }
}

// Generate questions from document content
async function generateQuestionsFromDocument(documentId, text, topic, userId = null) {
  try {
    const systemPrompt = `You are an expert at creating interview questions from technical documents.
Create 5 quality interview questions (mix of theory and coding) based on the provided text.
Return as JSON array with this structure:
[
  {
    "questionText": "question here",
    "answerText": "answer here",
    "difficulty": "easy|medium|hard",
    "type": "theory|coding"
  }
]`;

    const userMessage = `Create interview questions from this text:\n${text.substring(0, 2000)}`;

    const response = await fetch(
      ollamaUrl("/chat"),
      {
        method: "POST",
        headers: ollamaHeaders(),
        body: JSON.stringify({
          model: config.ollama.chatModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          stream: false,
        }),
      }
    );

    const data = await response.json();
    const content = data.message.content;

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("⚠️ No valid JSON found in AI response");
      return [];
    }

    const questions = JSON.parse(jsonMatch[0]);

    // Save to database
    const saved = [];
    for (const q of questions) {
      const question = await prisma.question.create({
        data: {
          topic,
          userId,
          questionText: q.questionText,
          answerText: q.answerText,
          difficulty: q.difficulty || "medium",
          type: q.type || "theory",
          source: "ai_generated",
          documentId,
        },
      });
      saved.push(question);
    }

    console.log(`✅ Generated ${saved.length} questions from document`);
    return saved;
  } catch (error) {
    console.error("❌ Question generation error:", error);
    return [];
  }
}

module.exports = { processAndStoreChunks, generateQuestionsFromDocument };
