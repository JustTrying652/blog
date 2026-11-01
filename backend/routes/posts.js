const express = require("express");
const auth = require("../middleware/auth");
const supabase = require("../supabase");

const router = express.Router();
const CATEGORIES = ["Technology", "Security", "Tutorial", "Life"];
const TYPES = ["article", "thought"];
const THOUGHT_MAX = 280;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Join the author's name from users; password_hash is never selected here
const COLUMNS = "id, type, title, category, content, created_at, updated_at, author_id, author:users!author_id(name)";

// Shape rows the way the frontend expects them
const toPost = (p) => ({
  id: p.id,
  type: p.type,
  title: p.title,
  category: p.category,
  content: p.content,
  author: p.author?.name ?? "Unknown",
  authorId: p.author_id,
  date: p.created_at.slice(0, 10),
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

// One set of validation rules, used by both create and update.
// Returns { row } on success or { error } with a message for the user.
function buildRow(type, body) {
  const content = String(body.content || "").trim();

  if (type === "thought") {
    if (!content) return { error: "Write something first." };
    if (content.length > THOUGHT_MAX) {
      return { error: `A thought can be at most ${THOUGHT_MAX} characters.` };
    }
    // Thoughts never carry a title or category, whatever the client sends
    return { row: { type, title: null, category: null, content } };
  }

  const title = String(body.title || "").trim();
  const category = String(body.category || "");

  if (!title || !category || !content) return { error: "Please fill in all fields." };
  if (title.length > 100) return { error: "Title must be 100 characters or fewer." };
  if (!CATEGORIES.includes(category)) return { error: "Invalid category." };
  if (content.length < 30) return { error: "Content should be at least 30 characters." };
  if (content.length > 5000) return { error: "Content is too long (max 5000 characters)." };

  return { row: { type, title, category, content } };
}

// GET /api/posts  (public)
// Optional filters: ?q=text (title or body)  &category=Security
router.get("/", async (req, res, next) => {
  try {
    let query = supabase
      .from("posts")
      .select(COLUMNS)
      .order("created_at", { ascending: false });

    const category = String(req.query.category || "");
    if (category) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ error: "Invalid category." });
      }
      query = query.eq("category", category);
    }

    // Strip characters that have a special meaning in the filter syntax
    const q = String(req.query.q || "").replace(/[,()%_*\\"']/g, " ").trim().slice(0, 100);
    if (q) {
      query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
    }

    const { data, error } = await query;
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

// POST /api/posts  (logged in): creates an article or a thought
router.post("/", auth, async (req, res, next) => {
  try {
    // Requests without a type are articles, so older clients keep working
    const type = req.body.type === undefined ? "article" : String(req.body.type);
    if (!TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid post type." });
    }

    const result = buildRow(type, req.body);
    if (result.error) return res.status(400).json({ error: result.error });

    // author_id comes from the verified token, never from the request body
    const { data, error } = await supabase
      .from("posts")
      .insert({ ...result.row, author_id: req.user.id })
      .select(COLUMNS)
      .single();
    if (error) throw error;

    res.status(201).json(toPost(data));
  } catch (err) {
    next(err);
  }
});

// PUT /api/posts/:id  (logged in, owner only): edit a post
router.put("/:id", auth, async (req, res, next) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(404).json({ error: "Post not found." });
    }

    const { data: existing, error } = await supabase
      .from("posts")
      .select("id, type, author_id")
      .eq("id", req.params.id)
      .maybeSingle();
    if (error) throw error;

    if (!existing) return res.status(404).json({ error: "Post not found." });
    if (existing.author_id !== req.user.id) {
      return res.status(403).json({ error: "You can only edit your own posts." });
    }

    // The type can't be changed by an edit; any type in the body is ignored
    const result = buildRow(existing.type, req.body);
    if (result.error) return res.status(400).json({ error: result.error });

    const { data, error: updateError } = await supabase
      .from("posts")
      .update({ ...result.row, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("author_id", req.user.id)
      .select(COLUMNS)
      .single();
    if (updateError) throw updateError;

    res.json(toPost(data));
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