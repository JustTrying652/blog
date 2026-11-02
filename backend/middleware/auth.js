const jwt = require("jsonwebtoken");
const supabase = require("../supabase");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXPIRED = { error: "Session expired. Please log in again." };

module.exports = async function auth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Please log in first." });
  }

  let payload;
  try {
    // Only accept the algorithm we sign with
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json(EXPIRED);
  }

  if (typeof payload.sub !== "string" || !UUID_RE.test(payload.sub)) {
    return res.status(401).json(EXPIRED);
  }

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, created_at, token_version")
      .eq("id", payload.sub)
      .maybeSingle();
    if (error) throw error;

    // Deleted account, or token issued before a password change or "log out everywhere"
    if (!user || user.token_version !== payload.tv) {
      return res.status(401).json(EXPIRED);
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
      tokenVersion: user.token_version,
    };
    next();
  } catch (err) {
    next(err);
  }
};