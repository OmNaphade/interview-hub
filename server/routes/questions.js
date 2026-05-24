const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const questionController = require("../controllers/questionController");

// Get all questions for a topic
router.get("/:topic", asyncHandler(questionController.getQuestionsByTopic));

// Get single question
router.get("/:topic/:questionId", asyncHandler(questionController.getQuestion));

module.exports = router;
