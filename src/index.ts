#!/usr/bin/env node
import { Command } from "commander";
import { exec } from "child_process";
import { StickerDB, AMOJI_DIR } from "./db";
import { startWebServer } from "./web";
import { AsciiCharsetName, AsciiColorMode, imageToAscii } from "./image-ascii";
import { Sticker } from "./types";
import path from "path";
import fs from "fs";

const IMAGES_DIR = path.join(AMOJI_DIR, "images");
const ASCII_DIR = path.join(AMOJI_DIR, "ascii");

// Ensure storage dirs exist
for (const dir of [IMAGES_DIR, ASCII_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\s]/g, "_");
}

const db = new StickerDB();
const program = new Command();

program
  .name("amoji")
  .description("Emoji/sticker manager for AI agents — collect, create, and search stickers")
  .version("0.3.0");

// ── helpers ──────────────────────────────────────────────────────────

function pad(s: string, n: number): string {
  return s.padEnd(n).slice(0, n);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function printTable(stickers: Sticker[]): void {
  if (stickers.length === 0) {
    console.log("(empty)");
    return;
  }

  const idW = Math.max(2, ...stickers.map((s) => String(s.id).length));
  const nameW = clamp(Math.max(4, ...stickers.map((s) => s.name.length)), 4, 18);
  const typeW = 5;
  const kwW = clamp(Math.max(8, ...stickers.map((s) => s.keywords.length || 1)), 8, 24);
  const contentW = clamp(Math.max(7, ...stickers.map((s) => s.content.length || 1)), 7, 30);

  const header =
    pad("ID", idW) +
    "  " + pad("Name", nameW) +
    "  " + pad("Type", typeW) +
    "  " + pad("Keywords", kwW) +
    "  " + pad("Used", 5) +
    "  " + pad("Description", contentW);
  console.log(header);
  console.log("─".repeat(header.length));

  for (const s of stickers) {
    const line =
      pad(String(s.id), idW) +
      "  " + pad(s.name, nameW) +
      "  " + pad(s.type, typeW) +
      "  " + pad(s.keywords || "-", kwW) +
      "  " + pad(String(s.usageCount), 5) +
      "  " + pad(s.content || "-", contentW);
    console.log(line);
  }
}

function fail(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function makeTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function uniqueName(desired: string): string {
  if (!db.getStickerByName(desired)) return desired;
  return `${desired}_${makeTimestamp()}`;
}

function parseDimension(value: string | undefined, name: string, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    fail(`${name} must be an integer from ${min} to ${max}`);
  }
  return parsed;
}

function parseColorMode(value: string): AsciiColorMode {
  const allowed: AsciiColorMode[] = ["auto", "none", "ansi16", "ansi256", "truecolor"];
  if (!allowed.includes(value as AsciiColorMode)) {
    fail(`--color-mode must be one of: ${allowed.join(", ")}`);
  }
  return value as AsciiColorMode;
}

function parseCharset(value: string): AsciiCharsetName {
  const allowed: AsciiCharsetName[] = ["standard", "dense", "minimal", "binary"];
  if (!allowed.includes(value as AsciiCharsetName)) {
    fail(`--charset must be one of: ${allowed.join(", ")}`);
  }
  return value as AsciiCharsetName;
}

interface AsciiRenderOptions {
  color?: boolean;
  colorMode: string;
  width?: string;
  height?: string;
  charset: string;
  chars?: string;
  background?: boolean;
  invert?: boolean;
}

function asciiOptions(opts: AsciiRenderOptions) {
  if (opts.chars && [...opts.chars].length < 2) {
    fail("--chars must contain at least two characters");
  }

  return {
    width: parseDimension(opts.width, "Width", 1, 400),
    height: parseDimension(opts.height, "Height", 1, 240),
    color: opts.color,
    colorMode: parseColorMode(opts.colorMode),
    charset: parseCharset(opts.charset),
    chars: opts.chars,
    background: opts.background,
    invert: opts.invert,
  };
}

// ── commands ─────────────────────────────────────────────────────────

program
  .command("add")
  .description("Add an image sticker — file is copied into .amoji/images/")
  .argument("<name>", "Sticker name (unique identifier)")
  .argument("<file>", "Path to image file")
  .option("-k, --keywords <k>", "Comma-separated keywords", "")
  .option("-d, --desc <text>", "Description of what this sticker expresses", "")
  .action((name: string, file: string, opts: { keywords: string; desc: string }) => {
    const srcPath = path.resolve(file);
    if (!fs.existsSync(srcPath)) fail(`File not found: ${srcPath}`);
    const finalName = uniqueName(name);

    const ext = path.extname(srcPath);
    const base = safeFilename(finalName);
    let destName = base + ext;
    let destPath = path.join(IMAGES_DIR, destName);
    let counter = 1;
    while (fs.existsSync(destPath)) {
      destName = `${base}_${counter}${ext}`;
      destPath = path.join(IMAGES_DIR, destName);
      counter++;
    }

    fs.copyFileSync(srcPath, destPath);
    const relPath = "images/" + destName;
    const sticker = db.addSticker(finalName, "image", relPath, opts.keywords, opts.desc);

    console.log(`Added: [${sticker.id}] ${sticker.name} (image)`);
    console.log(`  File:     ${destPath}`);
    if (sticker.content) console.log(`  Content:  ${sticker.content}`);
    if (sticker.keywords) console.log(`  Keywords: ${sticker.keywords}`);
  });

program
  .command("ascii")
  .description("Create an ASCII art sticker from an image file")
  .argument("<name>", "Sticker name (unique identifier)")
  .argument("<file>", "Path to image file")
  .option("-k, --keywords <k>", "Comma-separated keywords", "")
  .option("-d, --desc <text>", "Description of what this sticker expresses", "")
  .option("-w, --width <n>", "ASCII render width in columns")
  .option("-H, --height <n>", "ASCII render height in rows")
  .option("--color-mode <mode>", "Color mode: none, auto, ansi16, ansi256, truecolor", "none")
  .option("--no-color", "Shortcut for --color-mode none")
  .option("--charset <name>", "Character set: standard, dense, minimal, binary", "standard")
  .option("--chars <chars>", "Custom darkest-to-lightest character ramp")
  .option("--background", "Apply ANSI color to the background instead of the characters")
  .option("--invert", "Invert the brightness-to-character mapping")
  .action(async (name: string, file: string, opts: AsciiRenderOptions & {
    keywords: string;
    desc: string;
  }) => {
    const srcPath = path.resolve(file);
    if (!fs.existsSync(srcPath)) fail(`File not found: ${srcPath}`);
    const finalName = uniqueName(name);

    const art = await imageToAscii(srcPath, asciiOptions(opts));

    // Save art to file
    const base = safeFilename(finalName);
    let destName = base + ".txt";
    let destPath = path.join(ASCII_DIR, destName);
    let counter = 1;
    while (fs.existsSync(destPath)) {
      destName = `${base}_${counter}.txt`;
      destPath = path.join(ASCII_DIR, destName);
      counter++;
    }
    fs.writeFileSync(destPath, art, "utf-8");

    const relPath = "ascii/" + destName;
    const sticker = db.addSticker(finalName, "ascii", relPath, opts.keywords, opts.desc);

    console.log(`\nAdded: [${sticker.id}] ${sticker.name} (ascii)`);
    console.log(`  Source:   ${srcPath}`);
    console.log(`  File:     ${destPath}`);
    console.log("─── preview ───");
    console.log(art);
    console.log("───────────────");
    if (sticker.content) console.log(`Content:  ${sticker.content}`);
    if (sticker.keywords) console.log(`Keywords: ${sticker.keywords}`);
  });

program
  .command("list")
  .description("List all stickers")
  .option("--type <type>", "Filter by type (image/ascii)")
  .action((opts: { type?: string }) => {
    if (opts.type && opts.type !== "image" && opts.type !== "ascii") {
      fail('--type must be "image" or "ascii"');
    }
    printTable(db.listStickers(opts.type as "image" | "ascii" | undefined));
  });

program
  .command("search")
  .description("Search stickers by keyword, name, or content description")
  .argument("<query>", "Search query")
  .action((query: string) => {
    const results = db.search(query);
    if (results.length === 0) {
      console.log(`No stickers found for "${query}".`);
    } else {
      console.log(`Results for "${query}" (${results.length}):`);
      printTable(results);
    }
  });

program
  .command("keywords")
  .description("List all keywords in use across all stickers")
  .action(() => {
    const kws = db.getAllKeywords();
    if (kws.length === 0) {
      console.log("No keywords yet.");
      return;
    }
    // Calculate max width for alignment
    const maxLen = Math.max(...kws.map((k) => k.keyword.length));
    for (const kw of kws) {
      console.log(`  ${kw.keyword.padEnd(maxLen + 2)} (${kw.count})`);
    }
  });

program
  .command("show")
  .description("Display sticker content; also marks as used")
  .argument("<name>", "Sticker name or ID")
  .option("--ascii", "Render image sticker as ASCII art")
  .option("-w, --width <n>", "ASCII render width in columns")
  .option("-H, --height <n>", "ASCII render height in rows")
  .option("--color-mode <mode>", "Color mode: auto, none, ansi16, ansi256, truecolor", "auto")
  .option("--no-color", "Shortcut for --color-mode none")
  .option("--charset <name>", "Character set: standard, dense, minimal, binary", "standard")
  .option("--chars <chars>", "Custom darkest-to-lightest character ramp")
  .option("--background", "Apply ANSI color to the background instead of the characters")
  .option("--invert", "Invert the brightness-to-character mapping")
  .action(async (name: string, opts: AsciiRenderOptions & { ascii?: boolean }) => {
    const sticker = db.getSticker(name);
    if (!sticker) fail(`Sticker "${name}" not found`);
    db.markUsed(name);

    const filePath = path.join(AMOJI_DIR, sticker.path);
    if (!fs.existsSync(filePath)) fail(`File missing: ${filePath}`);

    if (sticker.type === "ascii") {
      process.stdout.write(fs.readFileSync(filePath, "utf-8"));
    } else if (opts.ascii) {
      const art = await imageToAscii(filePath, asciiOptions(opts));
      process.stdout.write(art);
    } else {
      console.log(filePath);
    }
  });

program
  .command("info")
  .description("Show sticker metadata (does NOT mark as used)")
  .argument("<name>", "Sticker name or ID")
  .action((name: string) => {
    const sticker = db.getSticker(name);
    if (!sticker) fail(`Sticker "${name}" not found`);

    const filePath = path.join(AMOJI_DIR, sticker.path);

    console.log(`ID:           ${sticker.id}`);
    console.log(`Name:         ${sticker.name}`);
    console.log(`Type:         ${sticker.type}`);
    console.log(`Description:  ${sticker.content || "-"}`);
    console.log(`Keywords:     ${sticker.keywords || "-"}`);
    console.log(`Created:      ${sticker.createdAt}`);
    console.log(`Last Used:    ${sticker.lastUsedAt || "-"}`);
    console.log(`Use Count:    ${sticker.usageCount}`);
    console.log(`File:         ${filePath}`);
    console.log(`Exists:       ${fs.existsSync(filePath) ? "yes" : "NO (file missing!)"}`);

    if (sticker.type === "ascii" && fs.existsSync(filePath)) {
      const art = fs.readFileSync(filePath, "utf-8");
      console.log(`Preview:\n───\n${art}\n───`);
    }
  });

program
  .command("use")
  .description("Mark a sticker as used and return its content")
  .argument("<name>", "Sticker name or ID")
  .option("--base64", "Also output base64-encoded content (image stickers only)")
  .option("--ascii", "Output ASCII art render (image stickers only)")
  .option("-w, --width <n>", "ASCII render width in columns")
  .option("-H, --height <n>", "ASCII render height in rows")
  .option("--color-mode <mode>", "Color mode: auto, none, ansi16, ansi256, truecolor", "auto")
  .option("--no-color", "Shortcut for --color-mode none")
  .option("--charset <name>", "Character set: standard, dense, minimal, binary", "standard")
  .option("--chars <chars>", "Custom darkest-to-lightest character ramp")
  .option("--background", "Apply ANSI color to the background instead of the characters")
  .option("--invert", "Invert the brightness-to-character mapping")
  .action(async (name: string, opts: AsciiRenderOptions & { base64?: boolean; ascii?: boolean }) => {
    const found = db.getSticker(name);
    if (!found) fail(`Sticker "${name}" not found`);
    db.markUsed(name);
    const s = db.getSticker(name)!;

    const filePath = path.join(AMOJI_DIR, s.path);

    if (s.type === "ascii") {
      if (!fs.existsSync(filePath)) fail(`File missing: ${filePath}`);
      const art = fs.readFileSync(filePath, "utf-8");
      console.log(`file:${filePath}`);
      console.log(`type:ascii`);
      console.log(`name:${s.name}`);
      console.log(`count:${s.usageCount}`);
      console.log(`───`);
      process.stdout.write(art);
    } else {
      console.log(`file:${filePath}`);
      console.log(`type:image`);
      console.log(`name:${s.name}`);
      console.log(`count:${s.usageCount}`);
      if (opts.ascii) {
        if (!fs.existsSync(filePath)) fail(`File missing: ${filePath}`);
        const art = await imageToAscii(filePath, asciiOptions(opts));
        console.log(`───`);
        process.stdout.write(art);
      }
      if (opts.base64) {
        if (!fs.existsSync(filePath)) fail(`File missing: ${filePath}`);
        const buf = fs.readFileSync(filePath);
        const b64 = buf.toString("base64");
        const ext = path.extname(filePath).toLowerCase().replace(".", "");
        const mimeMap: Record<string, string> = {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          webp: "image/webp",
          svg: "image/svg+xml",
          bmp: "image/bmp",
        };
        const mime = mimeMap[ext] || "application/octet-stream";
        console.log(`base64:data:${mime};base64,${b64}`);
      }
    }
  });

program
  .command("tag")
  .description("Set or append keywords for a sticker")
  .argument("<name>", "Sticker name or ID")
  .argument("<keywords>", "Comma-separated keywords")
  .option("-a, --append", "Append to existing keywords instead of replacing")
  .action((name: string, keywords: string, opts: { append?: boolean }) => {
    const sticker = db.getSticker(name);
    if (!sticker) fail(`Sticker "${name}" not found`);

    let final: string;
    if (opts.append && sticker.keywords) {
      const existing = sticker.keywords.split(",").map((k) => k.trim()).filter(Boolean);
      const added = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      final = [...new Set([...existing, ...added])].join(",");
    } else {
      final = keywords;
    }

    db.updateKeywords(name, final);
    console.log(`Keywords for "${sticker.name}": ${final}`);
  });

program
  .command("desc")
  .description("Set the content description for a sticker")
  .argument("<name>", "Sticker name or ID")
  .argument("<text>", "Description of what the sticker expresses")
  .action((name: string, text: string) => {
    if (!db.getSticker(name)) fail(`Sticker "${name}" not found`);
    db.updateContent(name, text);
    console.log(`Description for "${name}": ${text}`);
  });

program
  .command("delete")
  .description("Delete a sticker (also removes its file)")
  .argument("<name>", "Sticker name or ID")
  .action((name: string) => {
    const sticker = db.getSticker(name);
    if (!sticker) fail(`Sticker "${name}" not found`);

    const filePath = path.join(AMOJI_DIR, sticker.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Removed file: ${filePath}`);
    }

    db.deleteSticker(name);
    console.log(`Deleted: [${sticker.id}] ${sticker.name}`);
  });

program
  .command("recent")
  .description("Show recently used stickers")
  .option("-n, --limit <n>", "Number to show", "10")
  .action((opts: { limit: string }) => {
    const limit = parseInt(opts.limit) || 10;
    const stickers = db.getRecent(limit);
    console.log(`Recently used (${stickers.length}):`);
    printTable(stickers);
  });

program
  .command("popular")
  .description("Show most used stickers")
  .option("-n, --limit <n>", "Number to show", "10")
  .action((opts: { limit: string }) => {
    const limit = parseInt(opts.limit) || 10;
    const stickers = db.getPopular(limit);
    console.log(`Most used (${stickers.length}):`);
    printTable(stickers);
  });

program
  .command("web")
  .description("Start a web gallery to browse all stickers with filters")
  .option("-p, --port <port>", "Port to listen on", "3000")
  .action(async (opts: { port: string }) => {
    keepDbOpen = true;
    const preferredPort = parseInt(opts.port) || 3000;
    const { port, server } = await startWebServer(db, preferredPort);
    console.log(`Amoji web: http://localhost:${port}/`);

    const openCmd =
      process.platform === "darwin" ? "open" :
      process.platform === "win32" ? "start" : "xdg-open";
    exec(`${openCmd} http://localhost:${port}/`);

    process.on("SIGINT", () => {
      console.log("\nShutting down web server...");
      server.close();
      db.close();
      process.exit(0);
    });
  });

// ── run ──────────────────────────────────────────────────────────────

let keepDbOpen = false;

program.parseAsync().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
}).finally(() => {
  if (!keepDbOpen) db.close();
});
