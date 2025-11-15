require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Load feedback routes
const feedbackRoutes = require("./routes/feedback");
app.use("/api/feedback", feedbackRoutes);

// Load ADMIN feedback routes
const adminFeedbackRouter = require("./routes/adminFeedback");
console.log("Admin feedback router loaded");
app.use("/api/admin", adminFeedbackRouter);

app.get("/", (req, res) => {
  res.json({ message: "Backend running 🎉" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
