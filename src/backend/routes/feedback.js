const express = require("express");
const router = express.Router();
const dbPromise = require("../models/db");

// Submit feedback
router.post("/submit", async (req, res) => {
  try {
    const { question_id, user, comment, rating } = req.body;
    if (!question_id || !comment) {
      return res.status(400).json({ message: "Question ID and comment required" });
    }

    const db = await dbPromise;
    await db.run(
      "INSERT INTO feedback (question_id, user, comment, rating, status) VALUES (?, ?, ?, ?, ?)",
      [question_id, user, comment, rating, "pending"]
    );

    res.status(201).json({ message: "Feedback submitted successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit feedback", details: err.message });
  }
});

// Fetch feedbacks for testing
router.get("/review", async (req, res) => {
  try {
    const db = await dbPromise;
    const feedbacks = await db.all("SELECT * FROM feedback");
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve feedback", details: err.message });
  }
});

module.exports = router;
