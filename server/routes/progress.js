const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const progressController = require("../controllers/progressController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// Get all progress
router.get("/", asyncHandler(progressController.getAllProgress));

// Update topic progress
router.put(
  "/:topic/:stepName",
  asyncHandler(progressController.updateProgress)
);

// Get bookmarks
router.get("/bookmarks", asyncHandler(progressController.getBookmarks));

// Add bookmark
router.post("/bookmarks", asyncHandler(progressController.addBookmark));

// Remove bookmark
router.delete(
  "/bookmarks/:bookmarkId",
  asyncHandler(progressController.removeBookmark)
);

module.exports = router;
