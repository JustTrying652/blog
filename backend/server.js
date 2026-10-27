require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET in .env");
  process.exit(1);
}

const app = express();
const allowed = (process.env.CLIENT_ORIGINS || "").split(",").map((s) => s.trim());

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
}));
app.use(express.json({ limit: "10kb" }));

// Slow down password-guessing: 50 auth requests per 15 minutes per IP
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));

app.use((req, res) => res.status(404).json({ error: "Route not found." }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error. Please try again." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));