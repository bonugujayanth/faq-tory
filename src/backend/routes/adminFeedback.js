const express = require("express");
const router = express.Router();
const db = require("../models/db");

// GET all feedback for admin
router.get("/feedbacks", (req, res) => {
  db.all("SELECT * FROM feedback", [], (err, rows) => {
    if (err) {
      console.error("ADMIN ERROR:", err);
      return res.status(500).json({ error: "Failed to retrieve feedbacks" });
    }

    console.log("ADMIN: returning feedbacks:", rows);
    res.json(rows);
  });
});

// Update status
router.put("/feedbacks/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.run(
    "UPDATE feedback SET status = ? WHERE id = ?",
    [status, id],
    function (err) {
      if (err) {
        console.error("ADMIN UPDATE ERROR:", err);
        return res.status(500).json({ error: "Failed to update status" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      res.json({ message: "Status updated" });
    }
  );
});

module.exports = router;
