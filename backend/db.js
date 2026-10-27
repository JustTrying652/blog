const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "data.json");

const seedPosts = [
  { id: "seed-1", title: "Getting started with web security", category: "Security",
    content: "Always validate input, escape output, and never trust data that comes from the browser. These three habits prevent a huge share of common web vulnerabilities.",
    author: "Inkwell Team", authorId: "seed", date: "2026-10-01" },
  { id: "seed-2", title: "Why responsive design matters", category: "Tutorial",
    content: "More than half of web traffic comes from phones. Designing mobile-first with flexible grids and media queries keeps your layout usable everywhere.",
    author: "Inkwell Team", authorId: "seed", date: "2026-10-05" },
  { id: "seed-3", title: "JavaScript tips for beginners", category: "Technology",
    content: "Learn const and let, understand the DOM, and practise with small projects. Consistency beats cramming every time.",
    author: "Inkwell Team", authorId: "seed", date: "2026-10-10" },
];

function load() {
  if (!fs.existsSync(FILE)) {
    save({ users: [], posts: seedPosts });
  }
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = { load, save };