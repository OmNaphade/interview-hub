const { prisma } = require("../prisma/client");
const {
  extractPDF,
  extractDOCX,
  extractURL,
  calculateHash,
  calculateTextHash,
  chunkText,
  detectTopics,
} = require("../services/documentParser");
const {
  processAndStoreChunks,
  generateQuestionsFromDocument,
} = require("../services/embeddingService");
const {
  getRelevantChunks,
} = require("../services/ragService");
const fs = require("fs");
const path = require("path");
const config = require("../config");

// Ingest document (PDF, DOCX, or URL)
async function ingestDocument(req, res) {
  const { fileType, filePath, url } = req.body;

  try {
    let text = "";
    let hash = "";
    let filename = "";

    // Extract text based on file type
    if (fileType === "pdf" && filePath) {
      text = await extractPDF(filePath);
      hash = calculateHash(filePath);
      filename = path.basename(filePath);
    } else if (fileType === "docx" && filePath) {
      text = await extractDOCX(filePath);
      hash = calculateHash(filePath);
      filename = path.basename(filePath);
    } else if (fileType === "url" && url) {
      text = await extractURL(url);
      hash = calculateTextHash(text);
      filename = new URL(url).hostname;
    } else {
      return res.status(400).json({ error: "Invalid file type or path" });
    }

    // Check for duplicate
    const existing = await prisma.document.findFirst({
      where: { fileHash: hash, userId: req.user.id },
    });

    if (existing) {
      return res.json({
        message: "Document already ingested",
        document: existing,
      });
    }

    // Detect topics
    const topics = detectTopics(text);

    // Create document record
    const document = await prisma.document.create({
      data: {
        filename,
        userId: req.user.id,
        fileType,
        fileHash: hash,
        filePath: fileType !== "url" ? filePath : null,
        status: "processing",
        topicTags: topics,
      },
    });

    // Chunk text
    const chunks = chunkText(
      text,
      config.rag.chunkSize,
      config.rag.chunkOverlap
    );

    // Store chunks with embeddings
    await processAndStoreChunks(document.id, chunks, filename);

    // Generate questions from document
    if (topics.length > 0) {
      await generateQuestionsFromDocument(
        document.id,
        text,
        topics[0],
        req.user.id
      );
    }

    // Update document status
    const updatedDoc = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "processed",
        chunkCount: chunks.length,
        ingestedAt: new Date(),
      },
    });

    res.status(201).json({
      message: "Document ingested successfully",
      document: updatedDoc,
    });
  } catch (error) {
    console.error("❌ Ingest document error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Get all documents
async function getDocuments(req, res) {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.user.id },
      orderBy: { ingestedAt: "desc" },
      include: {
        _count: {
          select: { chunks: true, questions: true },
        },
      },
    });

    res.json(documents);
  } catch (error) {
    console.error("❌ Get documents error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Get document chunks preview
async function getChunks(req, res) {
  const { documentId } = req.params;
  const { limit = 10 } = req.query;

  try {
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId, document: { userId: req.user.id } },
      take: parseInt(limit),
      select: {
        id: true,
        chunkText: true,
        pageNum: true,
        chunkIndex: true,
      },
    });

    if (chunks.length === 0) {
      return res.status(404).json({ error: "No chunks found" });
    }

    res.json(chunks);
  } catch (error) {
    console.error("❌ Get chunks error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Delete document
async function deleteDocument(req, res) {
  const { documentId } = req.params;

  try {
    // Prisma cascade delete will remove chunks and questions
    await prisma.document.deleteMany({
      where: { id: documentId, userId: req.user.id },
    });

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("❌ Delete document error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Generate questions from document
async function generateQuestions(req, res) {
  const { documentId, topic } = req.body;

  try {
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: req.user.id },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Get chunks to rebuild text
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId, document: { userId: req.user.id } },
      select: { chunkText: true },
    });

    const text = chunks.map((c) => c.chunkText).join(" ");

    // Generate questions
    const questions = await generateQuestionsFromDocument(
      documentId,
      text,
      topic || document.topicTags[0] || "general",
      req.user.id
    );

    res.json({
      message: "Questions generated successfully",
      questionsCount: questions.length,
    });
  } catch (error) {
    console.error("❌ Generate questions error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Search documents (RAG)
async function searchDocuments(req, res) {
  const { query, topK = 5 } = req.body;

  try {
    const chunks = await getRelevantChunks(query, parseInt(topK), req.user.id);

    res.json({
      query,
      results: chunks.map((c) => ({
        source: c.source,
        pageNum: c.pageNum,
        excerpt: c.chunkText.substring(0, 200),
        distance: c.distance,
      })),
    });
  } catch (error) {
    console.error("❌ Search documents error:", error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  ingestDocument,
  getDocuments,
  getChunks,
  deleteDocument,
  generateQuestions,
  searchDocuments,
};
