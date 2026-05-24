const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const streamHandler = require("../middleware/streamHandler");
const chatController = require("../controllers/chatController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// Get all chat sessions
router.get("/sessions", asyncHandler(chatController.getSessions));

// Get single session with messages
router.get(
  "/sessions/:sessionId",
  asyncHandler(chatController.getSessionMessages)
);

// Create new chat session
router.post("/sessions", asyncHandler(chatController.createSession));

// Delete chat session
router.delete("/sessions/:sessionId", asyncHandler(chatController.deleteSession));

// Stream chat response
router.get("/stream", streamHandler, asyncHandler(chatController.streamMessage));

// Get coding hint
router.post("/hint", asyncHandler(chatController.getHint));

// Get code review
router.post("/review", asyncHandler(chatController.getCodeReview));

module.exports = router;
