require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const supabase = require("./supabase");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or too short. Use at least 32 random characters in .env");
  process.exit(1);
}

const app = express();

app.disable("x-powered-by");
// Render sits behind one proxy. Without this every visitor shares one IP,
// which breaks rate limiting.
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowed = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  maxAge: 600, // browsers cache the preflight for 10 minutes
}));
app.use(express.json({ limit: "10kb" }));

// Health check: used by Render, and handy for an uptime monitor.
// The tiny query also keeps the Supabase project from going idle.
app.get("/api/health", async (req, res) => {
  try {
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "error" });
  }
});

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