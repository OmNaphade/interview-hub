const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const playgroundController = require("../controllers/playgroundController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// Run code in Docker container
router.post("/run", asyncHandler(playgroundController.runCode));

// Get supported languages
router.get("/languages", asyncHandler(playgroundController.getLanguages));

module.exports = router;
