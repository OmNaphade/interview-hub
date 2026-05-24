const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const documentController = require("../controllers/documentController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// Ingest new document
router.post("/ingest", asyncHandler(documentController.ingestDocument));

// Get all documents
router.get("/", asyncHandler(documentController.getDocuments));

// Get document chunks preview
router.get("/:documentId/chunks", asyncHandler(documentController.getChunks));

// Delete document
router.delete("/:documentId", asyncHandler(documentController.deleteDocument));

// Generate questions from document
router.post(
  "/generate-questions",
  asyncHandler(documentController.generateQuestions)
);

// Search documents (RAG)
router.post("/search", asyncHandler(documentController.searchDocuments));

module.exports = router;
