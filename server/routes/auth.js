const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

router.post("/signup", asyncHandler(authController.signup));
router.post("/login", asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));
router.post("/password/forgot", asyncHandler(authController.requestPasswordReset));
router.post("/password/reset", asyncHandler(authController.resetPassword));
router.get("/config", asyncHandler(authController.authConfig));
router.get("/github", asyncHandler(authController.startGithub));
router.get("/github/callback", asyncHandler(authController.githubCallback));
router.get("/google", asyncHandler(authController.startGoogle));
router.get("/google/callback", asyncHandler(authController.googleCallback));
router.get("/me", requireAuth, asyncHandler(authController.me));
router.put("/me", requireAuth, asyncHandler(authController.updateProfile));
router.put("/password", requireAuth, asyncHandler(authController.changePassword));

module.exports = router;
