const { prisma } = require("../prisma/client");

// Get all progress
async function getAllProgress(req, res) {
  try {
    const progress = await prisma.topicProgress.findMany({
      where: { userId: req.user.id },
      orderBy: { topic: "asc" },
    });

    res.json(progress);
  } catch (error) {
    console.error("❌ Get progress error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Update topic progress
async function updateProgress(req, res) {
  const { topic, stepName } = req.params;
  const { status } = req.body;

  try {
    // Validate status
    const validStatuses = ["not_started", "in_progress", "done"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const progress = await prisma.topicProgress.upsert({
      where: {
        userId_topic_stepName: { userId: req.user.id, topic, stepName },
      },
      update: { status },
      create: { userId: req.user.id, topic, stepName, status },
    });

    res.json(progress);
  } catch (error) {
    console.error("❌ Update progress error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Get bookmarks
async function getBookmarks(req, res) {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.user.id },
      include: {
        question: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(bookmarks);
  } catch (error) {
    console.error("❌ Get bookmarks error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Add bookmark
async function addBookmark(req, res) {
  const { questionId } = req.body;

  try {
    // Check if already bookmarked
    const existing = await prisma.bookmark.findUnique({
      where: { userId_questionId: { userId: req.user.id, questionId } },
    });

    if (existing) {
      return res.json({ message: "Already bookmarked", bookmark: existing });
    }

    const bookmark = await prisma.bookmark.create({
      data: { userId: req.user.id, questionId },
      include: { question: true },
    });

    res.status(201).json(bookmark);
  } catch (error) {
    console.error("❌ Add bookmark error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Remove bookmark
async function removeBookmark(req, res) {
  const { bookmarkId } = req.params;

  try {
    await prisma.bookmark.deleteMany({
      where: { id: bookmarkId, userId: req.user.id },
    });

    res.json({ message: "Bookmark removed" });
  } catch (error) {
    console.error("❌ Remove bookmark error:", error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllProgress,
  updateProgress,
  getBookmarks,
  addBookmark,
  removeBookmark,
};
