const express = require("express");
const crypto = require("crypto");
const auth = require("../middleware/auth");
const { load, save } = require("../db");

const router = express.Router();
const CATEGORIES = ["Technology", "Security", "Tutorial", "Life"];

// GET /api/posts  (public)
router.get("/", (req, res) => {
  const posts = load().posts.slice().reverse();
  res.json(posts);
});

// GET /api/posts/mine  (logged in)
router.get("/mine", auth, (req, res) => {
  const mine = load().posts.filter((p) => p.authorId === req.user.id).reverse();
  res.json(mine);
});

// POST /api/posts  (logged in)
router.post("/", auth, (req, res) => {
  const title = String(req.body.title || "").trim();
  const category = String(req.body.category || "");
  const content = String(req.body.content || "").trim();

  if (!title || !category || !content) {
    return res.status(400).json({ error: "Please fill in all fields." });
  }
  if (title.length > 100) {
    return res.status(400).json({ error: "Title must be 100 characters or fewer." });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: "Invalid category." });
  }
  if (content.length < 30) {
    return res.status(400).json({ error: "Content should be at least 30 characters." });
  }
  if (content.length > 5000) {
    return res.status(400).json({ error: "Content is too long (max 5000 characters)." });
  }

  const post = {
    id: crypto.randomUUID(),
    title,
    category,
    content,
    // author comes from the verified token, never from the request body
    author: req.user.name,
    authorId: req.user.id,
    date: new Date().toISOString().slice(0, 10),
  };

  const db = load();
  db.posts.push(post);
  save(db);

  res.status(201).json(post);
});

// DELETE /api/posts/:id  (logged in, owner only)
router.delete("/:id", auth, (req, res) => {
  const db = load();
  const post = db.posts.find((p) => p.id === req.params.id);

  if (!post) return res.status(404).json({ error: "Post not found." });
  if (post.authorId !== req.user.id) {
    return res.status(403).json({ error: "You can only delete your own posts." });
  }

  db.posts = db.posts.filter((p) => p.id !== post.id);
  save(db);
  res.json({ message: "Post deleted." });
});

module.exports = router;