/* ---------- Config ---------- */
const API = "http://localhost:5000/api";
const SESSION_KEY = "blog_session";
const THEME_KEY = "inkwell_theme";
const FLASH_KEY = "inkwell_flash";

/* ---------- Icons (inline SVG, no library) ---------- */
const ICONS = {
  logo: '<path d="M12 2.5c3.2 4 6 7.1 6 10.6a6 6 0 01-12 0C6 9.6 8.8 6.5 12 2.5z"/><path d="M12 9.5v7"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.9 17.9A10.9 10.9 0 0112 20C5 20 1 12 1 12a18.5 18.5 0 015.1-5.9M9.9 4.2A9.1 9.1 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.2 3.2"/><path d="M1 1l22 22"/>',
  link: '<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  arrowLeft: '<path d="M19 12H5M11 5l-7 7 7 7"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  message: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
};

const icon = (name, size = 20) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;

/* ---------- Session helpers ---------- */
const getSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
};
const setSession = (data) => localStorage.setItem(SESSION_KEY, JSON.stringify(data));
const clearSession = () => localStorage.removeItem(SESSION_KEY);

/* ---------- Formatting helpers ---------- */
// Escape user content before putting it in HTML (prevents XSS)
const esc = (str) =>
  String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

const wordCount = (text) => (String(text).trim().match(/\S+/g) || []).length;
const readingTime = (text) => Math.max(1, Math.ceil(wordCount(text) / 200));

const fmtDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d) ? String(iso) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

function excerpt(text, max = 160) {
  const flat = String(text).replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

const initials = (name) =>
  String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

function avatar(name, size = 32) {
  let h = 0;
  for (const c of String(name)) h = (h + c.charCodeAt(0)) % 4;
  return `<span class="avatar av-${h}" style="--s:${size}px" aria-hidden="true">${esc(initials(name))}</span>`;
}

const postHref = (p) => `post.html?id=${encodeURIComponent(p.id)}`;

const isThought = (p) => p.type === "thought";
const isArticle = (p) => !isThought(p);

const isOwner = (p) => {
  const s = getSession();
  return Boolean(s && s.id === p.authorId);
};
const editLink = (p) => isOwner(p)
  ? `<a class="btn btn-ghost btn-sm" href="create-blog.html?edit=${encodeURIComponent(p.id)}">${icon("pen", 16)} Edit</a>`
  : "";

function timeAgo(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(String(iso).slice(0, 10));
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* ---------- API ---------- */
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
      redirectToLogin("Your session expired. Please log in again.");
    }
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

/* ---------- UI helpers ---------- */
function showMsg(text, type = "error", id = "formMsg") {
  const box = document.getElementById(id);
  box.textContent = text;
  box.className = `msg ${type}`;
  box.hidden = false;
}


function tokenExpired(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(part));
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}


function safeNext() {
  const next = new URLSearchParams(window.location.search).get("next") || "";
  return /^(dashboard|create-blog|post|index|profile)\.html(\?[\w%=&.-]*)?$/.test(next) ? next : "dashboard.html";
}

function redirectToLogin(message) {
  clearSession();
  if (message) flash(message, "error");
  const here = window.location.pathname.split("/").pop() + window.location.search;
  window.location.href = `login.html?next=${encodeURIComponent(here)}`;
}

function logout(message = "You've been logged out.") {
  clearSession();
  flash(message);
  window.location.href = "login.html";
}

// Guard for private pages: a token must exist, be unexpired and be accepted by the server
async function requireAuth() {
  const session = getSession();
  if (!session || !session.token) {
    redirectToLogin();
    return false;
  }
  if (tokenExpired(session.token)) {
    redirectToLogin("Your session expired. Please log in again.");
    return false;
  }
  try {
    const { user } = await api("/auth/me", { auth: true });
    setSession({ ...session, ...user }); // keeps name, email and join date fresh
    return true;
  } catch {
    // api() already redirected on a 401. For anything else (server down),
    // let the page show its own error state instead of bouncing the user.
    return Boolean(getSession());
  }
}

function setBusy(btn, busy) {
  if (!btn) return;
  if (busy) {
    btn.dataset.label = btn.textContent;
    btn.textContent = "Please wait…";
  } else if (btn.dataset.label) {
    btn.textContent = btn.dataset.label;
  }
  btn.disabled = busy;
}

// Toast notifications
function toast(text, type = "success") {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 250);
  }, 3500);
}

// A message that survives a page redirect
function flash(text, type = "success") {
  try { sessionStorage.setItem(FLASH_KEY, JSON.stringify({ text, type })); } catch { /* ignore */ }
}
function showFlash() {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FLASH_KEY);
    const { text, type } = JSON.parse(raw);
    toast(text, type);
  } catch { /* ignore */ }
}

// Confirmation modal (native <dialog>: focus trap and Esc come built in)
function confirmDialog({ title, text, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.className = "modal";
    dlg.innerHTML = `
      <div class="modal-body">
        <h2>${esc(title)}</h2>
        <p class="muted">${esc(text)}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-act="cancel">Cancel</button>
          <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="ok">${esc(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(dlg);

    const done = (value) => { dlg.close(); dlg.remove(); resolve(value); };
    dlg.addEventListener("click", (e) => {
      const act = e.target.dataset ? e.target.dataset.act : null;
      if (act === "ok") done(true);
      else if (act === "cancel" || e.target === dlg) done(false);
    });
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); done(false); });
    dlg.showModal();
    dlg.querySelector('[data-act="cancel"]').focus();
  });
}

// Empty and error states
function stateHTML({ icon: ic = "pen", title, text = "", action = "" }) {
  return `<div class="state">
    <div class="state-icon">${icon(ic, 26)}</div>
    <h3>${esc(title)}</h3>
    ${text ? `<p class="muted">${esc(text)}</p>` : ""}
    ${action}
  </div>`;
}
const retryBtn = `<button type="button" class="btn btn-ghost btn-sm" data-retry>Try again</button>`;

// Loading skeletons
const skeletonList = (n = 3) => Array.from({ length: n }, () => `
  <div class="post-item" aria-hidden="true">
    <div class="skeleton" style="width:80px;height:22px"></div>
    <div class="skeleton" style="width:70%;height:30px;margin:.8rem 0"></div>
    <div class="skeleton" style="width:95%"></div>
    <div class="skeleton" style="width:60%;margin-top:.5rem"></div>
  </div>`).join("");

const skeletonRows = (n = 3) => Array.from({ length: n }, () =>
  `<div class="row-card" aria-hidden="true"><div class="skeleton" style="width:60%;height:26px"></div></div>`).join("");

/* ---------- Theme ---------- */
const currentTheme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function updateThemeButtons() {
  const dark = currentTheme() === "dark";
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    const ti = btn.querySelector(".ti");
    if (ti) ti.innerHTML = icon(dark ? "sun" : "moon", 20);
    const label = btn.querySelector(".label");
    if (label) label.textContent = dark ? "Light mode" : "Dark mode";
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  });
}

function bindTheme() {
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
      updateThemeButtons();
    });
  });
  updateThemeButtons();
}

/* ---------- Header, footer, icons ---------- */
const NAV_ACTIVE = { home: "home", post: "home", dashboard: "dashboard", create: "create", profile: "profile" };
const AUTH_PAGES = ["login", "register"];

const brandHTML = () =>
  `<a class="brand" href="index.html"><span class="brand-mark">${icon("logo", 26)}</span><span class="brand-name">Inkwell</span></a>`;
const themeIconBtn = (extra = "") =>
  `<button type="button" class="icon-btn theme-toggle ${extra}"><span class="ti"></span></button>`;
const themeNavBtn = () =>
  `<button type="button" class="nav-link theme-toggle nav-theme"><span class="ti"></span><span class="label"></span></button>`;

function renderHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;
  const page = document.body.dataset.page;
  const user = getSession();

  if (AUTH_PAGES.includes(page)) {
    document.documentElement.classList.remove("authed");
    header.innerHTML = `<div class="auth-tools">${themeIconBtn()}</div>`;
  } else if (user) {
    document.documentElement.classList.add("authed");
    const active = NAV_ACTIVE[page];
    const link = (key, href, ic, label) =>
      `<a class="nav-link" href="${href}"${active === key ? ' aria-current="page"' : ""}>${icon(ic, 20)}<span>${label}</span></a>`;

    header.innerHTML = `
      <div class="topbar">
        <div class="topbar-inner">
          ${brandHTML()}
          ${themeIconBtn("topbar-theme")}
        </div>
      </div>
      <nav id="navLinks" class="nav-app" aria-label="Main">
        ${link("home", "index.html", "home", "Home")}
        ${link("dashboard", "dashboard.html", "dashboard", "Dashboard")}
        ${link("create", "create-blog.html", "pen", "Create Blog")}
        ${link("profile", "profile.html", "user", "Profile")}
        <span class="nav-spacer"></span>
        <a class="nav-user" href="profile.html" aria-label="Your profile">
          ${avatar(user.name, 36)}
          <div><strong>${esc(user.name)}</strong><small>${esc(user.email)}</small></div>
        </a>
        ${themeNavBtn()}
        <button type="button" class="nav-link" id="logoutBtn">${icon("logout", 20)}<span>Log out</span></button>
      </nav>`;
  } else {
    document.documentElement.classList.remove("authed");
    header.innerHTML = `
      <div class="topbar">
        <div class="container topbar-inner">
          ${brandHTML()}
          <nav id="navLinks" class="nav-guest" aria-label="Main">
            <a class="nav-text hide-sm" href="index.html">Home</a>
            <a class="nav-text" href="login.html">Log in</a>
            <a class="btn btn-primary btn-sm" href="register.html">Join Inkwell</a>
            ${themeIconBtn()}
          </nav>
        </div>
      </div>`;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => logout());
  bindTheme();
}

function renderFooter() {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  footer.innerHTML = `
    <div class="container footer-inner">
      <span class="footer-brand">${icon("logo", 18)} Inkwell</span>
      <span>Every thought has a place.</span>
      <span>&copy; 2026</span>
    </div>`;
}

// Fill any <span data-icon="name" data-size="20"> placeholders in the HTML
function hydrateIcons() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 20);
  });
}

function bindPasswordToggles() {
  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    const input = btn.parentElement.querySelector("input");
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = icon(show ? "eyeOff" : "eye", 20);
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.setAttribute("aria-pressed", String(show));
    });
  });
}

/* ---------- Article components ---------- */
function bylineHTML(p, size = 28) {
  return `<div class="byline">
    ${avatar(p.author, size)}
    <span class="byline-name">${esc(p.author)}</span>
    <span class="sep" aria-hidden="true">·</span>
    <time datetime="${esc(p.date)}">${esc(fmtDate(p.date))}</time>
    <span class="sep" aria-hidden="true">·</span>
    <span>${readingTime(p.content)} min read</span>
  </div>`;
}

const tagBtn = (c) => `<button type="button" class="tag" data-cat="${esc(c)}">${esc(c)}</button>`;

function postItem(p) {
  return `<article class="post-item">
    ${tagBtn(p.category)}
    <h3><a class="card-link" href="${postHref(p)}">${esc(p.title)}</a></h3>
    <p class="excerpt">${esc(excerpt(p.content, 170))}</p>
    ${bylineHTML(p)}
  </article>`;
}

function leadCard(p) {
  return `<article class="lead">
    <span class="eyebrow">Featured</span>
    <h3><a class="card-link" href="${postHref(p)}">${esc(p.title)}</a></h3>
    <p class="excerpt">${esc(excerpt(p.content, 240))}</p>
    <div class="lead-foot">
      <span class="tag">${esc(p.category)}</span>
      ${bylineHTML(p, 32)}
    </div>
  </article>`;
}

function miniCard(p) {
  return `<article class="mini">
    <span class="tag">${esc(p.category)}</span>
    <h3><a class="card-link" href="${postHref(p)}">${esc(p.title)}</a></h3>
    <p class="excerpt">${esc(excerpt(p.content, 100))}</p>
    ${bylineHTML(p, 24)}
  </article>`;
}

function thoughtCard(p) {
  return `<article class="thought">
    <div class="thought-head">
      ${avatar(p.author, 40)}
      <div class="thought-who">
        <strong>${esc(p.author)}</strong>
        <time datetime="${esc(p.createdAt)}" title="${esc(fmtDateTime(p.createdAt))}">${esc(timeAgo(p.createdAt))}</time>
      </div>
    </div>
    <p class="thought-text">${esc(p.content)}</p>
    <a class="card-link" href="${postHref(p)}" aria-label="Open thought by ${esc(p.author)}"></a>
  </article>`;
}

/* ---------- Page: Home ---------- */
async function initHome() {
  const user = getSession();
  if (user) {
    document.getElementById("ctaWrite").href = "create-blog.html";
    document.getElementById("joinCard").hidden = true;
  }

  const featuredSection = document.getElementById("featuredSection");
  const featuredEl = document.getElementById("featured");
  const thoughtsSection = document.getElementById("thoughtsSection");
  const thoughtsEl = document.getElementById("thoughts");
  const listEl = document.getElementById("posts");
  const filterEl = document.getElementById("activeFilter");
  const topicsEl = document.getElementById("topics");
  const writersEl = document.getElementById("writers");
  const statsEl = document.getElementById("heroStats");
  const search = document.getElementById("postSearch");
  const state = { posts: [], query: "", category: "" };

  const jumpToLatest = () =>
    document.getElementById("latest").scrollIntoView({ behavior: "smooth", block: "start" });

  function render() {
    const { category } = state;
    const q = state.query.trim().toLowerCase();
    const filtering = Boolean(q || category);
    const articles = state.posts.filter(isArticle);
    const thoughts = state.posts.filter(isThought);

    // Writers, ranked by number of articles
    const writerMap = new Map();
    articles.forEach((p) => {
      const w = writerMap.get(p.authorId) || { name: p.author, count: 0 };
      w.count += 1;
      writerMap.set(p.authorId, w);
    });

    const authorCount = new Set(state.posts.map((p) => p.authorId)).size;
    const parts = [];
    if (articles.length) parts.push(`${articles.length} ${articles.length === 1 ? "article" : "articles"}`);
    if (thoughts.length) parts.push(`${thoughts.length} ${thoughts.length === 1 ? "thought" : "thoughts"}`);
    statsEl.textContent = parts.length
      ? `${parts.join(" and ")} from ${authorCount} ${authorCount === 1 ? "writer" : "writers"}`
      : "";

    // Featured: the three newest articles (hidden while searching or filtering)
    const featuredIds = new Set();
    if (!filtering && articles.length) {
      const leadPosts = articles.slice(0, 3);
      leadPosts.forEach((p) => featuredIds.add(p.id));
      featuredEl.innerHTML =
        leadCard(leadPosts[0]) +
        (leadPosts.length > 1 ? `<div class="featured-more">${leadPosts.slice(1).map(miniCard).join("")}</div>` : "");
      featuredSection.hidden = false;
    } else {
      featuredSection.hidden = true;
    }

    // Community thoughts: the four newest (hidden while searching or filtering)
    if (!filtering && thoughts.length) {
      thoughtsEl.innerHTML = thoughts.slice(0, 4).map(thoughtCard).join("");
      thoughtsSection.hidden = false;
    } else {
      thoughtsSection.hidden = true;
    }

    // Latest articles
    let items = articles.filter((p) => !featuredIds.has(p.id));
    if (category) items = items.filter((p) => p.category === category);
    if (q) {
      items = items.filter((p) =>
        [p.title, p.content, p.author, p.category].some((f) => String(f).toLowerCase().includes(q)));
    }

    filterEl.innerHTML = filtering
      ? `<p class="filter-note">${items.length} ${items.length === 1 ? "result" : "results"}${q ? ` for “${esc(state.query.trim())}”` : ""}${category ? ` in ${esc(category)}` : ""}. <button type="button" class="link-btn" data-clear>Clear</button></p>`
      : "";

    if (items.length) {
      listEl.innerHTML = items.map(postItem).join("");
    } else if (filtering) {
      listEl.innerHTML = stateHTML({ icon: "search", title: "No articles found", text: "Try a different search or topic." });
    } else if (!articles.length) {
      listEl.innerHTML = stateHTML({
        icon: "pen", title: "No articles yet", text: "Be the first to publish something.",
        action: `<a class="btn btn-primary" href="${user ? "create-blog.html" : "register.html"}">Start writing</a>`,
      });
    } else {
      listEl.innerHTML = `<p class="muted caught-up">You're all caught up. New articles will appear here.</p>`;
    }

    // Trending topics: article categories ranked by count
    const counts = new Map();
    articles.forEach((p) => counts.set(p.category, (counts.get(p.category) || 0) + 1));
    const topics = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    topicsEl.innerHTML = topics.length
      ? topics.map(([c, n]) => `<button type="button" class="topic${c === category ? " is-active" : ""}" data-topic="${esc(c)}" aria-pressed="${c === category}"><span>${esc(c)}</span><span class="count">${n}</span></button>`).join("")
      : `<p class="muted">Topics appear as articles are published.</p>`;

    // Writers to read
    const topWriters = [...writerMap.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5);
    writersEl.innerHTML = topWriters.length
      ? topWriters.map((w) => `<button type="button" class="writer" data-writer="${esc(w.name)}">${avatar(w.name, 36)}<span class="writer-text"><strong>${esc(w.name)}</strong><small>${w.count} ${w.count === 1 ? "article" : "articles"}</small></span></button>`).join("")
      : `<p class="muted">Writers will show up here.</p>`;
  }

  async function load() {
    listEl.innerHTML = skeletonList(3);
    try {
      state.posts = await api("/posts");
      render();
    } catch (err) {
      featuredSection.hidden = true;
      thoughtsSection.hidden = true;
      listEl.innerHTML = stateHTML({ icon: "alert", title: "Couldn't load articles", text: err.message, action: retryBtn });
      listEl.querySelector("[data-retry]").addEventListener("click", load);
    }
  }

  search.addEventListener("input", () => { state.query = search.value; render(); });

  document.getElementById("explore").addEventListener("click", (e) => {
    const cat = e.target.closest("[data-cat]");
    const topic = e.target.closest("[data-topic]");
    const writer = e.target.closest("[data-writer]");
    const clear = e.target.closest("[data-clear]");
    if (cat) {
      state.category = cat.dataset.cat;
      render();
    } else if (topic) {
      state.category = state.category === topic.dataset.topic ? "" : topic.dataset.topic;
      render();
      jumpToLatest();
    } else if (writer) {
      state.query = writer.dataset.writer;
      search.value = state.query;
      render();
      jumpToLatest();
    } else if (clear) {
      state.query = "";
      state.category = "";
      search.value = "";
      render();
    }
  });

  load();
}

/* ---------- Page: Register ---------- */
function initRegister() {
  const pw = document.getElementById("password");
  const cf = document.getElementById("confirm");
  const hint = document.getElementById("confirmHint");

  const checkMatch = () => {
    if (!cf.value) { hint.textContent = ""; hint.className = "field-hint"; return; }
    const ok = pw.value === cf.value;
    hint.textContent = ok ? "Passwords match." : "Passwords don't match yet.";
    hint.className = `field-hint ${ok ? "ok" : "bad"}`;
  };
  pw.addEventListener("input", checkMatch);
  cf.addEventListener("input", checkMatch);

  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = pw.value;
    const confirm = cf.value;

    if (password !== confirm) return showMsg("Passwords do not match.");

    const btn = e.target.querySelector("button[type=submit]");
    setBusy(btn, true);
    try {
      await api("/auth/register", { method: "POST", body: { name, email, password } });
      flash("Account created. Log in to start writing.");
      window.location.href = "login.html";
    } catch (err) {
      showMsg(err.message);
      setBusy(btn, false);
    }
  });
}

/* ---------- Page: Login ---------- */
function initLogin() {
  if (getSession()) { window.location.href = safeNext(); return; }

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const btn = e.target.querySelector("button[type=submit]");
    setBusy(btn, true);
    try {
      const data = await api("/auth/login", { method: "POST", body: { email, password } });
      setSession({ token: data.token, ...data.user });
      window.location.href = safeNext();
    } catch (err) {
      showMsg(err.message);
      setBusy(btn, false);
    }
  });
}

/* ---------- Page: Dashboard ---------- */
async function initDashboard() {
  const tabParam = new URLSearchParams(window.location.search).get("tab");
  if (tabParam === "profile") { window.location.replace("profile.html"); return; }

  if (!(await requireAuth())) return;
  const user = getSession();
  const first = String(user.name).trim().split(/\s+/)[0];
  document.getElementById("welcome").textContent = `Welcome back, ${first}.`;

  const list = document.getElementById("myPosts");
  const tabs = document.querySelectorAll(".tab");
  const state = {
    mine: [],
    tab: tabParam === "thoughts" ? "thought" : "article",
  };

  const actions = (p, label) => `
    <div class="row-actions">
      <a class="btn btn-ghost btn-sm" href="${postHref(p)}">View</a>
      <a class="btn btn-ghost btn-sm" href="create-blog.html?edit=${encodeURIComponent(p.id)}">Edit</a>
      <button type="button" class="btn btn-ghost btn-sm btn-danger-ghost" data-id="${esc(p.id)}" data-kind="${esc(p.type)}" data-title="${esc(label)}">Delete</button>
    </div>`;

  const articleRow = (p) => `
    <article class="row-card">
      <div class="row-main">
        <h3><a href="${postHref(p)}">${esc(p.title)}</a></h3>
        <div class="row-meta">
          <span class="tag">${esc(p.category)}</span>
          <time datetime="${esc(p.date)}">${esc(fmtDate(p.date))}</time>
          <span>${readingTime(p.content)} min read</span>
        </div>
      </div>
      ${actions(p, p.title)}
    </article>`;

  const thoughtRow = (p) => `
    <article class="row-card">
      <div class="row-main">
        <h3 class="row-thought"><a href="${postHref(p)}">${esc(excerpt(p.content, 140))}</a></h3>
        <div class="row-meta">
          <span class="tag tag-thought">Thought</span>
          <time datetime="${esc(p.createdAt)}">${esc(timeAgo(p.createdAt))}</time>
          <span>${p.content.length} / 280</span>
        </div>
      </div>
      ${actions(p, excerpt(p.content, 60))}
    </article>`;

  function renderList() {
    tabs.forEach((t) => {
      const on = t.dataset.tab === state.tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-pressed", String(on));
    });

    const wantThoughts = state.tab === "thought";
    const items = state.mine.filter((p) => isThought(p) === wantThoughts);

    if (items.length) {
      list.innerHTML = items.map(wantThoughts ? thoughtRow : articleRow).join("");
    } else if (wantThoughts) {
      list.innerHTML = stateHTML({
        icon: "message",
        title: "No thoughts yet",
        text: "Share a quick idea, opinion or observation.",
        action: `<a class="btn btn-primary" href="create-blog.html?type=thought">Share a thought</a>`,
      });
    } else {
      list.innerHTML = stateHTML({
        icon: "pen",
        title: "Nothing published yet",
        text: "Your first article is one idea away.",
        action: `<a class="btn btn-primary" href="create-blog.html">Write your first article</a>`,
      });
    }
  }

  async function load() {
    list.innerHTML = skeletonRows(3);
    try {
      // /posts/mine returns only the posts whose author is the user in the verified token
      const [mine, all] = await Promise.all([
        api("/posts/mine", { auth: true }),
        api("/posts"),
      ]);
      state.mine = mine;

      const articles = mine.filter(isArticle);
      const thoughts = mine.filter(isThought);
      document.getElementById("statPosts").textContent = articles.length;
      document.getElementById("statThoughts").textContent = thoughts.length;
      document.getElementById("statWords").textContent =
        mine.reduce((n, p) => n + wordCount(p.content), 0).toLocaleString("en-GB");
      document.getElementById("statAll").textContent = all.length;
      document.getElementById("tabArticlesCount").textContent = articles.length;
      document.getElementById("tabThoughtsCount").textContent = thoughts.length;

      renderList();
    } catch (err) {
      list.innerHTML = stateHTML({ icon: "alert", title: "Couldn't load your posts", text: err.message, action: retryBtn });
      list.querySelector("[data-retry]").addEventListener("click", load);
    }
  }

  tabs.forEach((t) => t.addEventListener("click", () => {
    state.tab = t.dataset.tab;
    history.replaceState(null, "", state.tab === "thought" ? "dashboard.html?tab=thoughts" : "dashboard.html");
    renderList();
  }));

  list.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-id]");
    if (!btn) return;
    const thought = btn.dataset.kind === "thought";
    const ok = await confirmDialog({
      title: thought ? "Delete this thought?" : "Delete this article?",
      text: `“${btn.dataset.title}” will be permanently removed. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/posts/${encodeURIComponent(btn.dataset.id)}`, { method: "DELETE", auth: true });
      toast(thought ? "Thought deleted." : "Article deleted.");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  });

  load();
}


/* ---------- Page: Profile ---------- */
async function initProfile() {
  if (!(await requireAuth())) return;

  const panel = document.getElementById("profilePanel");
  let counts = null; // filled in once /posts/mine loads

  const metaText = () => {
    const me = getSession();
    const joined = new Date(me.createdAt);
    const parts = [];
    if (!isNaN(joined)) {
      parts.push(`Member since ${joined.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`);
    }
    if (counts) {
      parts.push(`${counts.articles} ${counts.articles === 1 ? "article" : "articles"}`);
      parts.push(`${counts.thoughts} ${counts.thoughts === 1 ? "thought" : "thoughts"}`);
    }
    return parts.join(" · ");
  };

  function render() {
    const me = getSession();

    panel.innerHTML = `
      <div class="profile-card profile-head">
        ${avatar(me.name, 72)}
        <div>
          <h2>${esc(me.name)}</h2>
          <p class="muted">${esc(me.email)}</p>
          <p class="muted" id="profileMeta">${esc(metaText())}</p>
        </div>
      </div>

      <div class="profile-grid">
        <form id="nameForm" class="profile-card" novalidate>
          <h3>Display name</h3>
          <p class="muted">Shown on your articles and thoughts.</p>
          <div id="nameMsg" class="msg" role="alert" hidden></div>
          <div class="field">
            <label for="profileName">Name</label>
            <input type="text" id="profileName" maxlength="60" autocomplete="name" value="${esc(me.name)}" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Save name</button>
        </form>

        <form id="passwordForm" class="profile-card" novalidate>
          <h3>Change password</h3>
          <p class="muted">You stay logged in here. Every other device is logged out.</p>
          <div id="passwordMsg" class="msg" role="alert" hidden></div>
          <div class="field">
            <label for="currentPassword">Current password</label>
            <input type="password" id="currentPassword" autocomplete="current-password" required />
          </div>
          <div class="field">
            <label for="newPassword">New password</label>
            <input type="password" id="newPassword" autocomplete="new-password" required />
            <p class="field-hint">At least 8 characters.</p>
          </div>
          <div class="field">
            <label for="confirmPassword">Confirm new password</label>
            <input type="password" id="confirmPassword" autocomplete="new-password" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Update password</button>
        </form>
      </div>

      <div class="profile-card profile-session">
        <div>
          <h3>Sessions</h3>
          <p class="muted">Log out of this device, or end every session on every device.</p>
        </div>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost" id="profileLogout">Log out</button>
          <button type="button" class="btn btn-ghost btn-danger-ghost" id="logoutAll">Log out everywhere</button>
        </div>
      </div>`;

    panel.querySelector("#nameForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = panel.querySelector("#profileName").value.trim();
      if (!name) return showMsg("Name can't be empty.", "error", "nameMsg");

      const btn = e.target.querySelector("button[type=submit]");
      setBusy(btn, true);
      try {
        const data = await api("/auth/me", { method: "PATCH", auth: true, body: { name } });
        setSession({ ...getSession(), ...data.user });
        renderHeader();   // refresh the sidebar name
        render();
        toast("Name updated.");
      } catch (err) {
        showMsg(err.message, "error", "nameMsg");
        setBusy(btn, false);
      }
    });

    panel.querySelector("#passwordForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentPassword = panel.querySelector("#currentPassword").value;
      const newPassword = panel.querySelector("#newPassword").value;
      const confirm = panel.querySelector("#confirmPassword").value;
      if (newPassword !== confirm) return showMsg("New passwords do not match.", "error", "passwordMsg");

      const btn = e.target.querySelector("button[type=submit]");
      setBusy(btn, true);
      try {
        const data = await api("/auth/password", {
          method: "POST", auth: true, body: { currentPassword, newPassword },
        });
        setSession({ token: data.token, ...data.user }); // fresh token: this device stays logged in
        e.target.reset();
        panel.querySelector("#passwordMsg").hidden = true;
        toast("Password updated. Other devices were logged out.");
      } catch (err) {
        showMsg(err.message, "error", "passwordMsg");
      }
      setBusy(btn, false);
    });

    panel.querySelector("#profileLogout").addEventListener("click", () => logout());

    panel.querySelector("#logoutAll").addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: "Log out everywhere?",
        text: "Every device, including this one, will need to log in again.",
        confirmLabel: "Log out everywhere",
        danger: true,
      });
      if (!ok) return;
      try {
        await api("/auth/logout-all", { method: "POST", auth: true });
        logout("You've been logged out of all devices.");
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  render();

  // Article and thought counts arrive a moment later and only update the one line,
  // so anything you've started typing in the forms isn't wiped
  try {
    const mine = await api("/posts/mine", { auth: true });
    counts = { articles: mine.filter(isArticle).length, thoughts: mine.filter(isThought).length };
    const meta = panel.querySelector("#profileMeta");
    if (meta) meta.textContent = metaText();
  } catch { /* counts are optional */ }
}

/* ---------- Page: Create Blog ---------- */
async function initCreate() {
  if (!(await requireAuth())) return;
  const user = getSession();
  const editId = new URLSearchParams(window.location.search).get("edit");

  const form = document.getElementById("blogForm");
  const titleEl = document.getElementById("title");
  const catEl = document.getElementById("category");
  const contentEl = document.getElementById("content");
  const wordsEl = document.getElementById("wordCount");
  const charsEl = document.getElementById("charCount");
  const thoughtEl = document.getElementById("thoughtContent");
  const thoughtCountEl = document.getElementById("thoughtCount");
  const articleFields = document.getElementById("articleFields");
  const thoughtFields = document.getElementById("thoughtFields");
  const kindEl = document.getElementById("studioKind");
  const editor = document.getElementById("editorPane");
  const preview = document.getElementById("previewPane");
  const previewBtn = document.getElementById("previewBtn");
  const picker = document.querySelector(".type-picker");
  const submitBtn = form.querySelector("button[type=submit]");
  let type = "article";
  let dirty = false;
  let leaving = false;

  document.getElementById("composerAvatar").innerHTML = avatar(user.name, 44);

  const updateCounts = () => {
    const w = wordCount(contentEl.value);
    wordsEl.textContent = `${w} ${w === 1 ? "word" : "words"}`;
    charsEl.textContent = `${contentEl.value.length} / 5000`;
  };
  const updateThoughtCount = () => {
    const n = thoughtEl.value.length;
    thoughtCountEl.textContent = `${n} / 280`;
    thoughtCountEl.classList.toggle("warn", n >= 260);
  };
  contentEl.addEventListener("input", updateCounts);
  thoughtEl.addEventListener("input", updateThoughtCount);
  [titleEl, catEl, contentEl, thoughtEl].forEach((el) => el.addEventListener("input", () => { dirty = true; }));

  // Warn before losing unsaved changes
  window.addEventListener("beforeunload", (e) => {
    if (dirty && !leaving) { e.preventDefault(); e.returnValue = ""; }
  });

  function setType(next, focus) {
    type = next;
    document.querySelectorAll(".type-card").forEach((card) => {
      card.classList.toggle("is-selected", card.querySelector("input").value === next);
    });
    articleFields.hidden = next !== "article";
    thoughtFields.hidden = next !== "thought";
    kindEl.textContent = next === "article" ? "New article" : "New thought";

    // Leave preview mode when switching
    preview.hidden = true;
    editor.hidden = false;
    previewBtn.textContent = "Preview";

    if (focus) (next === "thought" ? thoughtEl : titleEl).focus();
  }

  document.querySelectorAll('input[name="type"]').forEach((radio) => {
    radio.addEventListener("change", () => setType(radio.value, true));
  });

  // Edit mode: load the post, fill the form, lock the type
  async function loadForEdit() {
    picker.hidden = true;
    editor.hidden = true;
    submitBtn.disabled = true;
    previewBtn.disabled = true;
    kindEl.textContent = "Loading…";

    try {
      const p = await api(`/posts/${encodeURIComponent(editId)}`);
      if (p.authorId !== user.id) {
        flash("You can only edit your own posts.", "error");
        window.location.href = "dashboard.html";
        return;
      }

      setType(p.type, false);
      if (p.type === "thought") {
        thoughtEl.value = p.content;
      } else {
        titleEl.value = p.title;
        catEl.value = p.category;
        contentEl.value = p.content;
      }
      kindEl.textContent = p.type === "thought" ? "Edit thought" : "Edit article";
      submitBtn.textContent = "Save changes";
      submitBtn.disabled = false;
      previewBtn.disabled = false;
      updateCounts();
      updateThoughtCount();
      dirty = false;
    } catch (err) {
      kindEl.textContent = "Edit";
      showMsg(err.message);
    }
  }

  // Preview: shows how the post will look, built from what's typed (no backend needed)
  previewBtn.addEventListener("click", () => {
    if (!preview.hidden) {
      preview.hidden = true;
      editor.hidden = false;
      previewBtn.textContent = "Preview";
      return;
    }

    if (type === "thought") {
      const text = thoughtEl.value.trim();
      preview.innerHTML = `
        <div class="thought-view">
          <div class="thought-head">
            ${avatar(user.name, 52)}
            <div class="thought-who"><strong>${esc(user.name)}</strong><span>Preview</span></div>
          </div>
          <p class="thought-view-text">${esc(text || "Write something to see it here.")}</p>
        </div>`;
    } else {
      const title = titleEl.value.trim() || "Untitled";
      const category = catEl.value || "Uncategorised";
      const content = contentEl.value.trim();
      preview.innerHTML = `
        <span class="tag">${esc(category)}</span>
        <h1 class="article-title">${esc(title)}</h1>
        <div class="article-meta">
          ${avatar(user.name, 40)}
          <div class="article-by"><strong>${esc(user.name)}</strong><span>Preview · ${readingTime(content)} min read</span></div>
        </div>
        <div class="article-body">${esc(content || "Start writing to see your article here.")}</div>`;
    }
    preview.hidden = false;
    editor.hidden = true;
    previewBtn.textContent = "Back to editing";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = type === "thought"
      ? { type, content: thoughtEl.value.trim() }
      : { type, title: titleEl.value.trim(), category: catEl.value, content: contentEl.value.trim() };

    setBusy(submitBtn, true);
    try {
      if (editId) {
        const saved = await api(`/posts/${encodeURIComponent(editId)}`, { method: "PUT", auth: true, body });
        leaving = true;
        flash("Changes saved.");
        window.location.href = postHref(saved);
      } else {
        await api("/posts", { method: "POST", auth: true, body });
        leaving = true;
        flash(type === "thought" ? "Thought shared." : "Article published.");
        window.location.href = type === "thought" ? "dashboard.html?tab=thoughts" : "dashboard.html";
      }
    } catch (err) {
      showMsg(err.message);
      setBusy(submitBtn, false);
    }
  });

  if (editId) {
    loadForEdit();
  } else if (new URLSearchParams(window.location.search).get("type") === "thought") {
    // Dashboard links here with ?type=thought to open the thought composer directly
    document.querySelector('input[name="type"][value="thought"]').checked = true;
    setType("thought", false);
  }

  updateCounts();
  updateThoughtCount();
}

/* ---------- Page: Single post ---------- */
async function loadRelated(current) {
  const box = document.getElementById("related");
  const listEl = document.getElementById("relatedList");
  const titleEl = document.getElementById("relatedTitle");
  try {
    const others = (await api("/posts")).filter((p) => p.id !== current.id);

    if (isThought(current)) {
      const picks = others.filter(isThought).slice(0, 3);
      if (!picks.length) return;
      titleEl.textContent = "More thoughts";
      listEl.className = "thoughts-grid";
      listEl.innerHTML = picks.map(thoughtCard).join("");
    } else {
      const articles = others.filter(isArticle);
      const picks = [
        ...articles.filter((p) => p.category === current.category),
        ...articles.filter((p) => p.category !== current.category),
      ].slice(0, 3);
      if (!picks.length) return;
      titleEl.textContent = "Keep reading";
      listEl.className = "featured-more";
      listEl.innerHTML = picks.map(miniCard).join("");
    }
    box.hidden = false;
  } catch { /* related content is optional */ }
}

async function initPost() {
  const view = document.getElementById("postView");
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    view.innerHTML = stateHTML({
      icon: "alert", title: "Nothing selected",
      action: `<a class="btn btn-primary" href="index.html">Back to home</a>`,
    });
    return;
  }

  view.innerHTML = `
    <div aria-hidden="true">
      <div class="skeleton" style="width:90px;height:22px"></div>
      <div class="skeleton" style="width:85%;height:46px;margin:1.2rem 0"></div>
      <div class="skeleton" style="width:50%;margin-bottom:2rem"></div>
      <div class="skeleton" style="width:100%;margin:.6rem 0"></div>
      <div class="skeleton" style="width:96%;margin:.6rem 0"></div>
      <div class="skeleton" style="width:70%;margin:.6rem 0"></div>
    </div>`;

  const copyBtn = `<button type="button" class="btn btn-ghost btn-sm" id="copyLink">${icon("link", 16)} Copy link</button>`;

  const articleHTML = (p) => `
    <span class="tag">${esc(p.category)}</span>
    <h1 class="article-title">${esc(p.title)}</h1>
    <div class="article-meta">
      ${avatar(p.author, 44)}
      <div class="article-by">
        <strong>${esc(p.author)}</strong>
        <span><time datetime="${esc(p.date)}">${esc(fmtDate(p.date))}</time> · ${readingTime(p.content)} min read${p.updatedAt ? " · Edited" : ""}</span>
      </div>
      ${editLink(p)}
      ${copyBtn}
    </div>
    <div class="article-body">${esc(p.content)}</div>`;

  const thoughtHTML = (p) => `
    <div class="thought-view">
      <div class="thought-head">
        ${avatar(p.author, 52)}
        <div class="thought-who"><strong>${esc(p.author)}</strong><span>Thought</span></div>
      </div>
      <p class="thought-view-text">${esc(p.content)}</p>
      <div class="thought-view-foot">
        <time datetime="${esc(p.createdAt)}">${esc(fmtDateTime(p.createdAt))}${p.updatedAt ? " · Edited" : ""}</time>
        <div class="row-actions">${editLink(p)}${copyBtn}</div>
      </div>
    </div>`;

  async function load() {
    try {
      const p = await api(`/posts/${encodeURIComponent(id)}`);

      if (isThought(p)) {
        document.title = `${p.author}: ${excerpt(p.content, 50)} · Inkwell`;
        view.innerHTML = thoughtHTML(p);
      } else {
        document.title = `${p.title} · Inkwell`;
        view.innerHTML = articleHTML(p);
      }

      document.getElementById("copyLink").addEventListener("click", () => {
        navigator.clipboard.writeText(window.location.href)
          .then(() => toast("Link copied."))
          .catch(() => toast("Couldn't copy the link.", "error"));
      });

      loadRelated(p);
    } catch (err) {
      view.innerHTML = stateHTML({
        icon: "alert", title: "Couldn't open this post", text: err.message,
        action: `<a class="btn btn-primary" href="index.html">Back to home</a>`,
      });
    }
  }

  load();
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
  hydrateIcons();
  bindPasswordToggles();
  showFlash();

  const page = document.body.dataset.page;
  const pages = {
    home: initHome, register: initRegister, login: initLogin,
    dashboard: initDashboard, create: initCreate, post: initPost,
    profile: initProfile,
  };
  if (pages[page]) pages[page]();
});

window.addEventListener("pageshow", (e) => {
  const page = document.body.dataset.page;
  if (e.persisted && ["dashboard", "create", "profile"].includes(page) && !getSession()) {
    window.location.reload();
  }
});