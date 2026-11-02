const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../supabase");
const auth = require("../middleware/auth");

const router = express.Router();
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const USER_COLUMNS = "id, name, email, created_at, token_version";

// bcrypt only reads the first 72 bytes of a password
const passwordTooLong = (pw) => Buffer.byteLength(pw) > 72;

// Checked when an email isn't found, so a missing account takes as long to
// reject as a wrong password (stops attackers discovering which emails exist)
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  createdAt: u.created_at,
});

function signToken(user) {
  return jwt.sign({ tv: user.token_version }, process.env.JWT_SECRET, {
    subject: user.id,
    algorithm: "HS256",
    expiresIn: "1d",
  });
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
    if (passwordTooLong(password)) {
      return res.status(400).json({ error: "Password is too long (max 72 bytes)." });
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
      .select(`${USER_COLUMNS}, password_hash`)
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;

    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

    // Same message whether the email or the password was wrong
    if (!user || !ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  (logged in): who am I? Also tells the frontend the token is still valid
router.get("/me", auth, (req, res) => {
  res.json({ user: publicUser({ ...req.user, created_at: req.user.createdAt }) });
});

// PATCH /api/auth/me  (logged in): change display name
router.patch("/me", auth, async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Name can't be empty." });
    if (name.length > 60) return res.status(400).json({ error: "Name is too long." });

    const { data, error } = await supabase
      .from("users")
      .update({ name })
      .eq("id", req.user.id)
      .select(USER_COLUMNS)
      .single();
    if (error) throw error;

    res.json({ user: publicUser(data) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/password  (logged in): change password, log out every other device
router.post("/password", auth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Please fill in all fields." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters." });
    }
    if (passwordTooLong(newPassword)) {
      return res.status(400).json({ error: "New password is too long (max 72 bytes)." });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: "New password must be different from the current one." });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select(`${USER_COLUMNS}, password_hash`)
      .eq("id", req.user.id)
      .single();
    if (error) throw error;

    // 400, not 401: the frontend treats 401 as "session expired"
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({
        password_hash: await bcrypt.hash(newPassword, 10),
        token_version: user.token_version + 1, // invalidates every older token
      })
      .eq("id", user.id)
      .select(USER_COLUMNS)
      .single();
    if (updateError) throw updateError;

    // Hand back a fresh token so this device stays logged in
    res.json({ token: signToken(updated), user: publicUser(updated) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout-all  (logged in): end every session on every device
router.post("/logout-all", auth, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from("users")
      .update({ token_version: req.user.tokenVersion + 1 })
      .eq("id", req.user.id);
    if (error) throw error;

    res.json({ message: "Logged out of all devices." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;