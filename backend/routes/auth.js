const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { load, save } = require("../db");

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

    const db = load();
    if (db.users.some((u) => u.email === email)) {
      return res.status(409).json({ error: "That email is already registered." });
    }

    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
    };
    db.users.push(user);
    save(db);

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

    const user = load().users.find((u) => u.email === email);
    const ok = user && (await bcrypt.compare(password, user.passwordHash));

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