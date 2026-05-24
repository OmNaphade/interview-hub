const { getEmbedding } = require("./ollamaService");
const { prisma } = require("../prisma/client");

// Vector similarity search using pgvector
async function getRelevantChunks(query, topK = 5, userId = null) {
  try {
    const queryVector = await getEmbedding(query);

    const chunks = userId
      ? await prisma.$queryRaw`
          SELECT 
            dc.id, 
            dc."chunkText", 
            dc.source, 
            dc."pageNum",
            dc.embedding <-> ${queryVector}::vector AS distance
          FROM "DocumentChunk" dc
          INNER JOIN "Document" d ON d.id = dc."documentId"
          WHERE d."userId" = ${userId}
          ORDER BY distance ASC
          LIMIT ${topK}
        `
      : await prisma.$queryRaw`
          SELECT 
            id, 
            "chunkText", 
            source, 
            "pageNum",
            embedding <-> ${queryVector}::vector AS distance
          FROM "DocumentChunk"
          ORDER BY distance ASC
          LIMIT ${topK}
        `;

    return chunks;
  } catch (error) {
    console.error("❌ RAG search error:", error);
    return [];
  }
}

// Build RAG system prompt with context
function buildRAGPrompt(chunks, userQuery) {
  if (chunks.length === 0) {
    return `You are a helpful AI assistant.
The user has no reference documents available.

USER QUESTION: ${userQuery}`;
  }

  const context = chunks
    .map((c, i) => {
      const source = c.source || "Unknown";
      const pageNum = c.pageNum ? ` p.${c.pageNum}` : "";
      return `[${i + 1}] (${source}${pageNum})\n${c.chunkText}`;
    })
    .join("\n\n");

  return `You are a helpful AI assistant.
Use ONLY the following reference material to answer the question.
If the answer is not in the material, say so clearly.

REFERENCE MATERIAL:
${context}

USER QUESTION: ${userQuery}`;
}

// Format chunks for response citations
function formatChunkCitations(chunks) {
  return chunks.map((chunk) => ({
    filename: chunk.source,
    pageNum: chunk.pageNum,
    excerpt: chunk.chunkText.substring(0, 150) + "...",
  }));
}

module.exports = {
  getRelevantChunks,
  buildRAGPrompt,
  formatChunkCitations,
};
