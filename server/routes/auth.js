const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

router.post("/signup", asyncHandler(authController.signup));
router.post("/login", asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));
router.get("/me", requireAuth, asyncHandler(authController.me));

module.exports = router;
