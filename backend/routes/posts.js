const express = require("express");
const auth = require("../middleware/auth");
const supabase = require("../supabase");

const router = express.Router();
const CATEGORIES = ["Technology", "Security", "Tutorial", "Life"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Join the author's name from users; password_hash is never selected here
const COLUMNS = "id, title, category, content, created_at, author_id, author:users!author_id(name)";

// Shape rows the way the frontend expects them
const toPost = (p) => ({
  id: p.id,
  title: p.title,
  category: p.category,
  content: p.content,
  author: p.author?.name ?? "Unknown",
  authorId: p.author_id,
  date: p.created_at.slice(0, 10),
});

// GET /api/posts  (public)
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data.map(toPost));
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/mine  (logged in)
router.get("/mine", auth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(COLUMNS)
      .eq("author_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data.map(toPost));
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:id  (public: single post)
router.get("/:id", async (req, res, next) => {
  try {
    // Reject malformed ids early so Postgres doesn't throw on a bad uuid
    if (!UUID_RE.test(req.params.id)) {
      return res.status(404).json({ error: "Post not found." });
    }

    const { data, error } = await supabase
      .from("posts")
      .select(COLUMNS)
      .eq("id", req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Post not found." });

    res.json(toPost(data));
  } catch (err) {
    next(err);
  }
});

// POST /api/posts  (logged in)
router.post("/", auth, async (req, res, next) => {
  try {
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

    // author_id comes from the verified token, never from the request body
    const { data, error } = await supabase
      .from("posts")
      .insert({ title, category, content, author_id: req.user.id })
      .select(COLUMNS)
      .single();
    if (error) throw error;

    res.status(201).json(toPost(data));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id  (logged in, owner only)
router.delete("/:id", auth, async (req, res, next) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(404).json({ error: "Post not found." });
    }

    const { data: post, error } = await supabase
      .from("posts")
      .select("id, author_id")
      .eq("id", req.params.id)
      .maybeSingle();
    if (error) throw error;

    if (!post) return res.status(404).json({ error: "Post not found." });
    if (post.author_id !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own posts." });
    }

    const { error: delError } = await supabase.from("posts").delete().eq("id", post.id);
    if (delError) throw delError;

    res.json({ message: "Post deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;