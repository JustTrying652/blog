/* ---------- Config ---------- */
const API = "http://localhost:5000/api";
const SESSION_KEY = "blog_session";

/* ---------- Helpers ---------- */
const getSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
};
const setSession = (data) => localStorage.setItem(SESSION_KEY, JSON.stringify(data));
const clearSession = () => localStorage.removeItem(SESSION_KEY);

// Escape user content before putting it in HTML (prevents XSS)
const esc = (str) =>
  String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

// One function for every API call
async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  const session = getSession();
  if (auth && session) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }

  if (!res.ok) {
    // Token expired or invalid on a protected request: back to login
    if (res.status === 401 && auth) {
      clearSession();
      window.location.href = "login.html";
    }
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

function showMsg(text, type = "error") {
  const box = document.getElementById("formMsg");
  box.textContent = text;
  box.className = `msg ${type}`;
  box.hidden = false;
}

function requireLogin() {
  if (!getSession()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

/* ---------- Header / nav ---------- */
function renderHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;
  const user = getSession();

  const links = user
    ? `<a href="index.html">Home</a>
       <a href="dashboard.html">Dashboard</a>
       <a href="create-blog.html">New Post</a>
       <a href="#" id="logoutBtn">Logout</a>`
    : `<a href="index.html">Home</a>
       <a href="login.html">Login</a>
       <a href="register.html" class="btn btn-small">Register</a>`;

  header.innerHTML = `
    <div class="container nav">
      <a class="brand" href="index.html">Inkwell</a>
      <button class="menu-btn" id="menuBtn" aria-label="Toggle menu" aria-expanded="false">&#9776;</button>
      <nav id="navLinks">${links}</nav>
    </div>`;

  const menuBtn = document.getElementById("menuBtn");
  const nav = document.getElementById("navLinks");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });

  const logout = document.getElementById("logoutBtn");
  if (logout) {
    logout.addEventListener("click", (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = "login.html";
    });
  }
}

async function initHome() {
  const wrap = document.getElementById("posts");
  wrap.innerHTML = `<p class="muted">Loading posts…</p>`;

  try {
    const posts = await api("/posts");
    if (posts.length === 0) {
      wrap.innerHTML = `<p class="muted">No posts yet. Be the first to write one!</p>`;
      return;
    }
    wrap.innerHTML = posts.map((p) => {
      const link = `post.html?id=${encodeURIComponent(p.id)}`;
      return `
      <article class="card post">
        <span class="tag">${esc(p.category)}</span>
        <h3><a href="${link}">${esc(p.title)}</a></h3>
        <p>${esc(p.content.length > 140 ? p.content.slice(0, 140) + "…" : p.content)}</p>
        <div class="meta">By ${esc(p.author)} &middot; ${esc(p.date)}</div>
        <a class="read-more" href="${link}">Read more &rarr;</a>
      </article>`;
    }).join("");
  } catch (err) {
    wrap.innerHTML = `<p class="msg error">${esc(err.message)}</p>`;
  }
}

/* ---------- Page: Register ---------- */
function initRegister() {
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;

    if (password !== confirm) return showMsg("Passwords do not match.");

    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await api("/auth/register", { method: "POST", body: { name, email, password } });
      showMsg("Account created! Redirecting to login…", "success");
      setTimeout(() => (window.location.href = "login.html"), 1000);
    } catch (err) {
      showMsg(err.message);
      btn.disabled = false;
    }
  });
}

/* ---------- Page: Login ---------- */
function initLogin() {
  if (getSession()) { window.location.href = "dashboard.html"; return; }

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const data = await api("/auth/login", { method: "POST", body: { email, password } });
      setSession({ token: data.token, ...data.user });
      window.location.href = "dashboard.html";
    } catch (err) {
      showMsg(err.message);
      btn.disabled = false;
    }
  });
}

/* ---------- Page: Dashboard ---------- */
async function initDashboard() {
  if (!requireLogin()) return;
  const user = getSession();
  document.getElementById("welcome").textContent = `Welcome, ${user.name}`;

  const list = document.getElementById("myPosts");

  async function render() {
    try {
      const [mine, all] = await Promise.all([
        api("/posts/mine", { auth: true }),
        api("/posts"),
      ]);

      document.getElementById("statPosts").textContent = mine.length;
      document.getElementById("statAll").textContent = all.length;

      if (mine.length === 0) {
        list.innerHTML = `<p class="muted">You haven't written anything yet. <a href="create-blog.html">Create your first post</a>.</p>`;
        return;
      }
      list.innerHTML = mine.map((p) => `
        <div class="card row">
          <div>
            <h3><a href="post.html?id=${encodeURIComponent(p.id)}">${esc(p.title)}</a></h3>
            <span class="tag">${esc(p.category)}</span>
            <span class="meta">&nbsp;${esc(p.date)}</span>
          </div>
          <button class="btn btn-danger btn-small" data-id="${esc(p.id)}">Delete</button>
        </div>`).join("");
    } catch (err) {
      list.innerHTML = `<p class="msg error">${esc(err.message)}</p>`;
    }
  }

  list.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;
    if (!id || !confirm("Delete this post?")) return;
    try {
      await api(`/posts/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
      render();
    } catch (err) {
      alert(err.message);
    }
  });

  render();
}

/* ---------- Page: Create Blog ---------- */
function initCreate() {
  if (!requireLogin()) return;

  document.getElementById("blogForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value.trim();
    const category = document.getElementById("category").value;
    const content = document.getElementById("content").value.trim();

    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await api("/posts", { method: "POST", auth: true, body: { title, category, content } });
      showMsg("Post published! Redirecting…", "success");
      setTimeout(() => (window.location.href = "dashboard.html"), 800);
    } catch (err) {
      showMsg(err.message);
      btn.disabled = false;
    }
  });
}

/* ---------- Page: Single post ---------- */
async function initPost() {
  const view = document.getElementById("postView");
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    view.innerHTML = `<p class="msg error">No post selected.</p>`;
    return;
  }

  try {
    const p = await api(`/posts/${encodeURIComponent(id)}`);
    document.title = `Inkwell | ${p.title}`;
    view.innerHTML = `
      <span class="tag">${esc(p.category)}</span>
      <h1>${esc(p.title)}</h1>
      <div class="meta">By ${esc(p.author)} &middot; ${esc(p.date)}</div>
      <div class="article-body">${esc(p.content)}</div>`;
  } catch (err) {
    view.innerHTML = `<p class="msg error">${esc(err.message)}</p>`;
  }
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  const page = document.body.dataset.page;
  const pages = {
    home: initHome, register: initRegister, login: initLogin,
    dashboard: initDashboard, create: initCreate, post: initPost,
  };
  if (pages[page]) pages[page]();
});