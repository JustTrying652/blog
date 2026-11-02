require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or too short. Use at least 32 random characters in .env");
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

// Slow down password guessing: 50 attempts per 15 minutes per IP,
// only on the endpoints that actually check a password
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/password", authLimiter);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));

app.use((req, res) => res.status(404).json({ error: "Route not found." }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error. Please try again." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));