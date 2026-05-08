import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";
import { Sticker, StickerRow, toSticker } from "./types";

export const AMOJI_DIR = path.join(os.homedir(), ".amoji");
const DB_PATH = path.join(AMOJI_DIR, "stickers.db");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export class StickerDB {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolved = dbPath || DB_PATH;
    ensureDir(path.dirname(resolved));

    this.db = new Database(resolved);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stickers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        keywords TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL CHECK(type IN ('image', 'ascii')),
        path TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        last_used_at TEXT,
        usage_count INTEGER DEFAULT 0
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS stickers_fts USING fts5(
        name, keywords, content,
        content='stickers',
        content_rowid='id',
        tokenize='unicode61'
      );

      CREATE TRIGGER IF NOT EXISTS stickers_ai AFTER INSERT ON stickers BEGIN
        INSERT INTO stickers_fts(rowid, name, keywords, content)
        VALUES (new.id, new.name, REPLACE(new.keywords, ',', ' '), new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS stickers_ad AFTER DELETE ON stickers BEGIN
        INSERT INTO stickers_fts(stickers_fts, rowid, name, keywords, content)
        VALUES ('delete', old.id, old.name, REPLACE(old.keywords, ',', ' '), old.content);
      END;

      CREATE TRIGGER IF NOT EXISTS stickers_au AFTER UPDATE ON stickers BEGIN
        INSERT INTO stickers_fts(stickers_fts, rowid, name, keywords, content)
        VALUES ('delete', old.id, old.name, REPLACE(old.keywords, ',', ' '), old.content);
        INSERT INTO stickers_fts(rowid, name, keywords, content)
        VALUES (new.id, new.name, REPLACE(new.keywords, ',', ' '), new.content);
      END;
    `);
  }

  addSticker(
    name: string,
    type: "image" | "ascii",
    dbPath: string,
    keywords: string,
    content: string
  ): Sticker {
    const stmt = this.db.prepare(`
      INSERT INTO stickers (name, type, path, keywords, content)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, type, dbPath, keywords, content);
    return this.getStickerById(Number(result.lastInsertRowid))!;
  }

  getStickerByName(name: string): Sticker | undefined {
    const row = this.db
      .prepare("SELECT * FROM stickers WHERE name = ?")
      .get(name) as StickerRow | undefined;
    return row ? toSticker(row) : undefined;
  }

  getStickerById(id: number): Sticker | undefined {
    const row = this.db
      .prepare("SELECT * FROM stickers WHERE id = ?")
      .get(id) as StickerRow | undefined;
    return row ? toSticker(row) : undefined;
  }

  getSticker(nameOrId: string): Sticker | undefined {
    const num = Number(nameOrId);
    if (!isNaN(num) && String(num) === nameOrId.trim()) {
      return this.getStickerById(num);
    }
    return this.getStickerByName(nameOrId);
  }

  markUsed(nameOrId: string): boolean {
    const sticker = this.getSticker(nameOrId);
    if (!sticker) return false;
    this.db
      .prepare(
        `UPDATE stickers SET usage_count = usage_count + 1, last_used_at = datetime('now') WHERE id = ?`
      )
      .run(sticker.id);
    return true;
  }

  deleteSticker(nameOrId: string): boolean {
    const sticker = this.getSticker(nameOrId);
    if (!sticker) return false;
    this.db.prepare("DELETE FROM stickers WHERE id = ?").run(sticker.id);
    return true;
  }

  listStickers(type?: "image" | "ascii"): Sticker[] {
    let query = "SELECT * FROM stickers";
    const params: string[] = [];
    if (type) {
      query += " WHERE type = ?";
      params.push(type);
    }
    query += " ORDER BY name ASC";
    const rows = this.db.prepare(query).all(...params) as StickerRow[];
    return rows.map(toSticker);
  }

  search(query: string): Sticker[] {
    const escaped = query.replace(/['"*()]/g, "").trim();
    if (!escaped) return [];

    const terms = escaped.split(/\s+/).filter(Boolean);
    const ftsQuery = terms.map((t) => `"${t}"*`).join(" AND ");

    // Try FTS5 first
    let rows: StickerRow[] = [];
    try {
      rows = this.db
        .prepare(
          `SELECT s.* FROM stickers s
           INNER JOIN stickers_fts f ON s.id = f.rowid
           WHERE stickers_fts MATCH ?
           ORDER BY rank
           LIMIT 20`
        )
        .all(ftsQuery) as StickerRow[];
    } catch {
      // FTS syntax error — fall through to LIKE
    }

    if (rows.length > 0) return rows.map(toSticker);

    // FTS returned nothing or errored — fall back to LIKE (handles CJK etc.)
    const clauses = terms
      .map(() => "(keywords LIKE ? OR name LIKE ? OR content LIKE ?)")
      .join(" AND ");
    const patterns: string[] = [];
    for (const t of terms) {
      patterns.push(`%${t}%`, `%${t}%`, `%${t}%`);
    }
    rows = this.db
      .prepare(
        `SELECT * FROM stickers WHERE ${clauses}
         ORDER BY usage_count DESC, last_used_at DESC
         LIMIT 20`
      )
      .all(...patterns) as StickerRow[];
    return rows.map(toSticker);
  }

  getRecent(limit: number): Sticker[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM stickers WHERE last_used_at IS NOT NULL
         ORDER BY last_used_at DESC LIMIT ?`
      )
      .all(limit) as StickerRow[];
    return rows.map(toSticker);
  }

  getPopular(limit: number): Sticker[] {
    const rows = this.db
      .prepare("SELECT * FROM stickers ORDER BY usage_count DESC LIMIT ?")
      .all(limit) as StickerRow[];
    return rows.map(toSticker);
  }

  updateKeywords(nameOrId: string, keywords: string): boolean {
    const sticker = this.getSticker(nameOrId);
    if (!sticker) return false;
    this.db
      .prepare("UPDATE stickers SET keywords = ? WHERE id = ?")
      .run(keywords, sticker.id);
    return true;
  }

  getAllKeywords(): { keyword: string; count: number }[] {
    const rows = this.db
      .prepare("SELECT keywords FROM stickers WHERE keywords != ''")
      .all() as { keywords: string }[];
    const map = new Map<string, number>();
    for (const row of rows) {
      for (const kw of row.keywords.split(",")) {
        const t = kw.trim();
        if (t) map.set(t, (map.get(t) || 0) + 1);
      }
    }
    return [...map.entries()]
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword));
  }

  updateContent(nameOrId: string, content: string): boolean {
    const sticker = this.getSticker(nameOrId);
    if (!sticker) return false;
    this.db
      .prepare("UPDATE stickers SET content = ? WHERE id = ?")
      .run(content, sticker.id);
    return true;
  }

  close(): void {
    this.db.close();
  }
}
