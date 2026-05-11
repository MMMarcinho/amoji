import http from "http";
import fs from "fs";
import path from "path";
import { StickerDB, AMOJI_DIR } from "./db";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".txt": "text/plain; charset=utf-8",
};

function mimeType(fp: string): string {
  return MIME[path.extname(fp).toLowerCase()] || "application/octet-stream";
}

function serveFile(res: http.ServerResponse, absPath: string): void {
  const resolved = path.resolve(absPath);
  if (!resolved.startsWith(path.resolve(AMOJI_DIR) + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const data = fs.readFileSync(resolved);
    res.writeHead(200, {
      "Content-Type": mimeType(resolved),
      "Content-Length": stat.size,
      "Cache-Control": "public, max-age=3600",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

function apiStickers(db: StickerDB, res: http.ServerResponse): void {
  const stickers = db.listStickers();
  const result = stickers.map((s) => {
    const item: Record<string, unknown> = {
      id: s.id,
      name: s.name,
      keywords: s.keywords,
      type: s.type,
      path: s.path,
      content: s.content,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      usageCount: s.usageCount,
    };
    if (s.type === "ascii") {
      try {
        item.asciiContent = fs.readFileSync(
          path.join(AMOJI_DIR, s.path),
          "utf-8"
        );
      } catch {
        item.asciiContent = "[file missing]";
      }
    }
    return item;
  });
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
}

function apiKeywords(db: StickerDB, res: http.ServerResponse): void {
  const keywords = db.getAllKeywords();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(keywords));
}

function html(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Amoji — Sticker Collection</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #f5f5f7;
    color: #1d1d1f;
    min-height: 100vh;
  }

  header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid #e8e8ed;
    padding: 16px 24px;
  }
  header h1 {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.3px;
    margin-bottom: 12px;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .filters label { font-size: 13px; color: #86868b; font-weight: 500; }

  .type-btn {
    border: 1px solid #d2d2d7;
    background: #fff;
    color: #1d1d1f;
    padding: 5px 14px;
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .type-btn.active {
    background: #0071e3;
    color: #fff;
    border-color: #0071e3;
  }
  .type-btn:hover:not(.active) { background: #f0f0f5; }

  .tag-chip {
    border: 1px solid #d2d2d7;
    background: #fff;
    color: #48484a;
    padding: 5px 12px;
    border-radius: 16px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .tag-chip.active {
    background: #1d1d1f;
    color: #fff;
    border-color: #1d1d1f;
  }
  .tag-chip:hover:not(.active) { background: #f0f0f5; }
  .tag-chip .count { color: #aeaeb2; font-size: 11px; margin-left: 2px; }
  .tag-chip.active .count { color: #aeaeb2; }

  .search-input {
    border: 1px solid #d2d2d7;
    background: #fff;
    color: #1d1d1f;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 13px;
    outline: none;
    min-width: 180px;
  }
  .search-input:focus { border-color: #0071e3; box-shadow: 0 0 0 2px rgba(0,113,227,0.15); }

  .result-count {
    font-size: 13px;
    color: #86868b;
    margin-left: auto;
    white-space: nowrap;
  }

  main {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .card {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    transition: box-shadow 0.2s;
    display: flex;
    flex-direction: column;
  }
  .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }

  .card-media {
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    max-height: 260px;
    overflow: hidden;
  }
  .card-media img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    max-height: 260px;
  }
  .card-media pre {
    width: 100%;
    padding: 12px;
    font-family: "SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace;
    font-size: 6px;
    line-height: 1.1;
    color: #66bb6a;
    background: #1e1e1e;
    overflow: auto;
    white-space: pre;
    max-height: 260px;
    text-align: left;
  }

  .card-body {
    padding: 14px 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .card-name {
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .badge {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 7px;
    border-radius: 4px;
  }
  .badge-image { background: #e8f5e9; color: #2e7d32; }
  .badge-ascii { background: #fff3e0; color: #e65100; }

  .card-desc {
    font-size: 13px;
    color: #86868b;
    line-height: 1.4;
  }
  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .card-tag {
    font-size: 11px;
    color: #48484a;
    background: #f0f0f5;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;
    border: none;
    font-family: inherit;
  }
  .card-tag:hover { background: #e0e0eb; }

  .card-meta {
    font-size: 11px;
    color: #aeaeb2;
    display: flex;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 4px;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 80px 20px;
    color: #86868b;
  }
  .empty-state p { font-size: 15px; margin-top: 8px; }

  @media (max-width: 640px) {
    header { padding: 12px 16px; }
    main { padding: 12px; grid-template-columns: 1fr; }
    .filters { gap: 6px; }
    .search-input { min-width: 120px; width: 100%; }
  }
</style>
</head>
<body>
<header>
  <h1>Amoji</h1>
  <div class="filters">
    <label>Type:</label>
    <button class="type-btn active" data-type="all">All</button>
    <button class="type-btn" data-type="image">Image</button>
    <button class="type-btn" data-type="ascii">ASCII</button>
    <span style="color:#d2d2d7;margin:0 4px;">|</span>
    <input class="search-input" type="text" placeholder="Search name or description…" id="search">
    <span class="result-count" id="count"></span>
  </div>
  <div class="filters" id="tag-filters" style="margin-top:8px;"></div>
</header>
<main id="grid"></main>

<script>
const grid = document.getElementById("grid");
const countEl = document.getElementById("count");
const searchInput = document.getElementById("search");
const tagFilters = document.getElementById("tag-filters");

let stickers = [];
let allKeywords = [];
let activeType = "all";
let activeTag = null;

async function init() {
  const [sr, kr] = await Promise.all([
    fetch("/api/stickers").then(r => r.json()),
    fetch("/api/keywords").then(r => r.json()),
  ]);
  stickers = sr;
  allKeywords = kr;
  renderTags();
  render();
}

function renderTags() {
  if (allKeywords.length === 0) {
    tagFilters.innerHTML = "";
    return;
  }
  const top = allKeywords.slice(0, 30);
  let html = '<label>Tags:</label>';
  for (const kw of top) {
    const active = activeTag === kw.keyword ? " active" : "";
    html += \`<button class="tag-chip\${active}" data-tag="\${escHtml(kw.keyword)}">\${escHtml(kw.keyword)}<span class="count">\${kw.count}</span></button>\`;
  }
  tagFilters.innerHTML = html;

  tagFilters.querySelectorAll(".tag-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const tag = btn.dataset.tag;
      activeTag = activeTag === tag ? null : tag;
      renderTags();
      render();
    });
  });
}

function escHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function filter() {
  return stickers.filter(s => {
    if (activeType !== "all" && s.type !== activeType) return false;
    if (activeTag) {
      const kws = s.keywords.split(",").map(k => k.trim().toLowerCase());
      if (!kws.includes(activeTag.toLowerCase())) return false;
    }
    const q = searchInput.value.trim().toLowerCase();
    if (q) {
      return s.name.toLowerCase().includes(q) ||
             (s.content && s.content.toLowerCase().includes(q)) ||
             s.keywords.toLowerCase().includes(q);
    }
    return true;
  });
}

function render() {
  const filtered = filter();
  countEl.textContent = filtered.length + " sticker" + (filtered.length !== 1 ? "s" : "");

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No stickers match the current filters.</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(s => {
    let media = "";
    if (s.type === "image") {
      media = \`<img src="/files/\${escHtml(s.path)}" alt="\${escHtml(s.name)}" loading="lazy">\`;
    } else {
      const art = (s.asciiContent || "").trimEnd();
      media = \`<pre>\${escHtml(art)}</pre>\`;
    }

    const tagEls = s.keywords
      ? s.keywords.split(",").map(k => k.trim()).filter(Boolean)
          .map(k => \`<button class="card-tag" data-tag="\${escHtml(k)}">\${escHtml(k)}</button>\`).join("")
      : "";

    const badgeClass = s.type === "image" ? "badge-image" : "badge-ascii";

    return \`
      <div class="card">
        <div class="card-media">\${media}</div>
        <div class="card-body">
          <div class="card-name">
            \${escHtml(s.name)}
            <span class="badge \${badgeClass}">\${escHtml(s.type)}</span>
          </div>
          \${s.content ? \`<div class="card-desc">\${escHtml(s.content)}</div>\` : ""}
          \${tagEls ? \`<div class="card-tags">\${tagEls}</div>\` : ""}
          <div class="card-meta">
            <span>Used \${s.usageCount}×</span>
            \${s.lastUsedAt ? \`<span>Last: \${escHtml(s.lastUsedAt)}</span>\` : ""}
          </div>
        </div>
      </div>\`;
  }).join("");

  // Bind tag clicks on cards
  grid.querySelectorAll(".card-tag").forEach(btn => {
    btn.addEventListener("click", () => {
      activeTag = btn.dataset.tag;
      renderTags();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// Type buttons
document.querySelectorAll(".type-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".type-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeType = btn.dataset.type;
    render();
  });
});

// Search
searchInput.addEventListener("input", render);

init();
</script>
</body>
</html>`;
}

function requestHandler(
  db: StickerDB
): http.RequestListener {
  return (req, res) => {
    const url = (req.url || "/").split("?")[0];

    if (url === "/api/stickers") return apiStickers(db, res);
    if (url === "/api/keywords") return apiKeywords(db, res);

    if (url.startsWith("/files/")) {
      const relPath = url.slice(7);
      const absPath = path.join(AMOJI_DIR, relPath);
      return serveFile(res, absPath);
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    res.end(html());
  };
}

export function startWebServer(
  db: StickerDB,
  preferredPort: number
): Promise<{ port: number; server: http.Server }> {
  return new Promise((resolve, reject) => {
    let currentPort = preferredPort;
    let server: http.Server;

    function attempt(): void {
      server = http.createServer(requestHandler(db));

      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && currentPort < preferredPort + 10) {
          currentPort++;
          attempt();
        } else {
          reject(err);
        }
      });

      server.listen(currentPort, () => {
        resolve({ port: currentPort, server });
      });
    }

    attempt();
  });
}
