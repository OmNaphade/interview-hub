const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const interviewController = require("../controllers/interviewController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// Start new interview session
router.post("/start", asyncHandler(interviewController.startInterview));

// Submit answer and get next question
router.post("/answer", asyncHandler(interviewController.submitAnswer));

// Get interview session summary
router.get(
  "/summary/:sessionId",
  asyncHandler(interviewController.getInterviewSummary)
);

module.exports = router;
