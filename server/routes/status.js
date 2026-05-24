const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { pingStatus } = require("../controllers/statusController");

// Health check
router.get("/", asyncHandler(pingStatus));

module.exports = router;
