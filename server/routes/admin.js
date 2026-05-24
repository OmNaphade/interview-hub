const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const adminController = require("../controllers/adminController");

router.use(requireAuth, requireAdmin);

router.get("/dashboard", asyncHandler(adminController.dashboard));
router.get("/users", asyncHandler(adminController.listUsers));
router.delete("/users/:userId", asyncHandler(adminController.deleteUser));
router.get("/progress", asyncHandler(adminController.listProgress));
router.delete("/progress/:progressId", asyncHandler(adminController.deleteProgress));
router.delete("/users/:userId/progress", asyncHandler(adminController.clearUserProgress));

router.get("/questions", asyncHandler(adminController.listQuestions));
router.post("/questions", asyncHandler(adminController.createQuestion));
router.put("/questions/:questionId", asyncHandler(adminController.updateQuestion));
router.delete("/questions/:questionId", asyncHandler(adminController.deleteQuestion));

router.get("/roadmap", asyncHandler(adminController.listRoadmap));
router.post("/roadmap", asyncHandler(adminController.createRoadmapItem));
router.put("/roadmap/:itemId", asyncHandler(adminController.updateRoadmapItem));
router.delete("/roadmap/:itemId", asyncHandler(adminController.deleteRoadmapItem));

module.exports = router;
