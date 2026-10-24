const KEYS = { users: "blog_users", session: "blog_session", posts: "blog_posts" };

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));


const esc = (str) =>
  String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

async function hash(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const getSession = () => read(KEYS.session, null);
const getPosts = () => read(KEYS.posts, []);

/* -- Seed data -- */
if (getPosts().length === 0) {
  write(KEYS.posts, [
    { id: 1, title: "web security", category: "Security",
      content: "Always validate input, escape output, and never trust data that comes from the browser. These three habits prevent a huge share of common web vulnerabilities.",
      author: "Inkwell", email: "team@inkwell.dev", date: "2026" },
    { id: 2, title: "Why responsive design matters", category: "Tutorial",
      content: "More than half of web traffic comes from phones. Designing mobile-first with flexible grids and media queries keeps your layout usable everywhere.",
      author: "Inkwell", email: "team@inkwell.dev", date: "2026" },
    { id: 3, title: "JavaScript", category: "Technology",
      content: "Learn const and let, understand the DOM, and practise with small projects. Consistency beats cramming every time.",
      author: "Inkwell", email: "team@inkwell.dev", date: "2026" },
  ]);
}

/* -- Header / nav --*/
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
      localStorage.removeItem(KEYS.session);
      window.location.href = "login.html";
    });
  }
}

/* -- Small UI helpers -- */
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

/* -- Page: Home -- */
function initHome() {
  const wrap = document.getElementById("posts");
  const posts = [...getPosts()].sort((a, b) => b.id - a.id);
  wrap.innerHTML = posts.map((p) => `
    <article class="card post">
      <span class="tag">${esc(p.category)}</span>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.content.length > 140 ? p.content.slice(0, 140) + "…" : p.content)}</p>
      <div class="meta">By ${esc(p.author)} &middot; ${esc(p.date)}</div>
    </article>`).join("");
}

/* -- Page: Register -- */
function initRegister() {
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;

    if (!name || !email || !password) return showMsg("Please fill in all fields.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return showMsg("Enter a valid email address.");
    if (password.length < 8) return showMsg("Password must be at least 8 characters.");
    if (password !== confirm) return showMsg("Passwords do not match.");

    const users = read(KEYS.users, []);
    if (users.some((u) => u.email === email)) return showMsg("That email is already registered.");

    users.push({ name, email, password: await hash(password) });
    write(KEYS.users, users);

    showMsg("Account created! Redirecting to login…", "success");
    setTimeout(() => (window.location.href = "login.html"), 1000);
  });
}

/* -- Page: Login -- */
function initLogin() {
  if (getSession()) { window.location.href = "dashboard.html"; return; }

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    if (!email || !password) return showMsg("Enter your email and password.");

    const users = read(KEYS.users, []);
    const user = users.find((u) => u.email === email);
    const ok = user && user.password === (await hash(password));

    // Same message for both cases so attackers can't tell which part was wrong
    if (!ok) return showMsg("Invalid email or password.");

    write(KEYS.session, { name: user.name, email: user.email });
    window.location.href = "dashboard.html";
  });
}

/* -- Page: Dashboard -- */
function initDashboard() {
  if (!requireLogin()) return;
  const user = getSession();

  document.getElementById("welcome").textContent = `Welcome, ${user.name}`;

  function render() {
    const all = getPosts();
    const mine = all.filter((p) => p.email === user.email).sort((a, b) => b.id - a.id);

    document.getElementById("statPosts").textContent = mine.length;
    document.getElementById("statAll").textContent = all.length;

    const list = document.getElementById("myPosts");
    if (mine.length === 0) {
      list.innerHTML = `<p class="muted">You haven't written anything yet. <a href="create-blog.html">Create your first post</a>.</p>`;
      return;
    }
    list.innerHTML = mine.map((p) => `
      <div class="card row">
        <div>
          <h3>${esc(p.title)}</h3>
          <span class="tag">${esc(p.category)}</span>
          <span class="meta">&nbsp;${esc(p.date)}</span>
        </div>
        <button class="btn btn-danger btn-small" data-id="${p.id}">Delete</button>
      </div>`).join("");
  }

  document.getElementById("myPosts").addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (!confirm("Delete this post?")) return;
    // Only allow deleting your own posts
    write(KEYS.posts, getPosts().filter((p) => !(p.id === Number(id) && p.email === user.email)));
    render();
  });

  render();
}

/* -- Page: Create Blog -- */
function initCreate() {
  if (!requireLogin()) return;
  const user = getSession();

  document.getElementById("blogForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value.trim();
    const category = document.getElementById("category").value;
    const content = document.getElementById("content").value.trim();

    if (!title || !category || !content) return showMsg("Please fill in all fields.");
    if (content.length < 30) return showMsg("Content should be at least 30 characters.");

    const posts = getPosts();
    posts.push({
      id: Date.now(), title, category, content,
      author: user.name, email: user.email,
      date: new Date().toISOString().slice(0, 10),
    });
    write(KEYS.posts, posts);

    showMsg("Post published! Redirecting…", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 800);
  });
}

/* -- Boot -- */
document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  const page = document.body.dataset.page;
  const pages = { home: initHome, register: initRegister, login: initLogin, dashboard: initDashboard, create: initCreate };
  if (pages[page]) pages[page]();
});