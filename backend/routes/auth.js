const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../supabase");

const router = express.Router();
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Please fill in all fields." });
    }
    if (name.length > 60) {
      return res.status(400).json({ error: "Name is too long." });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { error } = await supabase.from("users").insert({ name, email, password_hash });

    if (error) {
      // 23505 = unique violation, so the email already exists
      if (error.code === "23505") {
        return res.status(409).json({ error: "That email is already registered." });
      }
      throw error;
    }

    res.status(201).json({ message: "Account created." });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Enter your email and password." });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;

    const ok = user && (await bcrypt.compare(password, user.password_hash));

    // Same message whether the email or the password was wrong
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    res.json({
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;