![Amoji README header](assets/readme-header.png)

# amoji

Emoji/sticker manager for AI agents — collect, create, and search custom stickers stored locally.

[中文文档](README.zh-CN.md)

## Installation

### Global (recommended for CLI use)

```bash
npm install -g amoji
```

After installation, the `amoji` command is available everywhere:

```bash
amoji list
amoji search "happy"
```

### Prerequisites

Node.js >= 20 on a standard platform (Windows / macOS / Linux, x64 or arm64).  
`better-sqlite3` ships prebuilt binaries for all supported Node versions — no build toolchain needed in normal use.

If you are on an uncommon CPU architecture or running Node from source, the native module may need to fall back to compilation:

| Platform | Fallback requirement |
|---|---|
| **Windows** | [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with "Desktop development with C++" workload |
| **macOS** | Xcode Command Line Tools: `xcode-select --install` |
| **Linux** | `build-essential` + `python3`: `sudo apt install build-essential python3` |

### Development setup

```bash
git clone https://github.com/MMMarcinho/amoji.git
cd amoji
npm install
npm run build
npm link          # makes `amoji` available globally from source
```

Or run directly without installing:

```bash
npx tsx src/index.ts <command>
```

Stickers are stored in `~/.amoji/` (images in `~/.amoji/images/`, ASCII art in `~/.amoji/ascii/`, database at `~/.amoji/stickers.db`).

---

## Commands

### Add stickers

**Add an image file:**
```bash
amoji add <name> <file> [-k keywords] [-d description]

amoji add thumbsup ~/Downloads/thumbsup.png -k "approve,yes,good" -d "strong approval"
```

**Create ASCII art from an image:**
```bash
amoji ascii <name> <file> [-k keywords] [-d description] [-w width] [-H height]

amoji ascii thumbsup_ascii ~/Downloads/thumbsup.png -w 72 -k "approve,yes,good" -d "strong approval"
```

ASCII generation defaults to plain 7-bit characters for maximum terminal compatibility. Optional rendering controls:

```bash
amoji ascii face ~/Downloads/face.png --charset dense --color-mode ansi256
amoji ascii face_plain ~/Downloads/face.png --width 100 --height 32 --no-color
```

Supported color modes are `none`, `auto`, `ansi16`, `ansi256`, and `truecolor`. Supported character sets are `standard`, `dense`, `minimal`, and `binary`; use `--chars` for a custom darkest-to-lightest ramp.

---

### Find stickers

**Search** by name, keywords, or description:
```bash
amoji search <query>

amoji search "happy"
amoji search "approve good"
```

**List all stickers** (optionally filtered by type):
```bash
amoji list
amoji list --type ascii
amoji list --type image
```

**List all keywords** with usage counts:
```bash
amoji keywords
```

**Recently used:**
```bash
amoji recent [-n limit]     # default 10
```

**Most used:**
```bash
amoji popular [-n limit]    # default 10
```

---

### Use a sticker

**Show sticker content** (and mark as used):
```bash
amoji show <name|id>
amoji show <name|id> --ascii --width 80 --color-mode auto
```

For ASCII stickers this prints the stored art to stdout. For image stickers it prints the absolute file path unless `--ascii` is used.

**Show metadata only** (does not increment usage count):
```bash
amoji info <name|id>
```

**Mark as used and get structured output:**
```bash
amoji use <name|id>            # file path + metadata
amoji use <name|id> --base64   # also returns base64 data URI (images only)
amoji use <name|id> --ascii --charset dense --color-mode ansi16
```

Outputs structured `key:value` lines:

- `file:<absolute-path>` — always present
- `type:image|ascii` — always present
- `name:<name>` — always present
- `count:<n>` — usage count after marking
- `base64:<data-uri>` — only with `--base64` on image stickers
- `───` separator followed by raw ASCII art (ASCII stickers, or image stickers with `--ascii`)

---

### Edit stickers

**Set or replace keywords:**
```bash
amoji tag <name|id> <keywords>

amoji tag thumbsup "approve,yes,great"
```

**Append keywords:**
```bash
amoji tag thumbsup "perfect,nice" --append
```

**Set description:**
```bash
amoji desc <name|id> <text>

amoji desc thumbsup "enthusiastic approval or agreement"
```

---

### Delete a sticker

```bash
amoji delete <name|id>
```

Removes both the database record and the file from `~/.amoji/`.

---

## Sticker IDs

Every sticker has a numeric ID. Most commands accept either the name or the ID:

```bash
amoji show 3
amoji info thumbsup
amoji delete 7
```

---

## Tips

- Names must be unique. If you add a sticker with a name that already exists, a timestamp is appended automatically.
- FTS (full-text search) is used for `search`. If it returns nothing, a `LIKE` fallback runs automatically.
- `show` and `use` both increment the usage counter; `info` does not.
- `use --base64` encodes the image file on the fly and outputs a data URI — convenient for embedding in HTML/markdown without a separate file server.
- `--color-mode auto` emits ANSI color only when stdout looks like a capable terminal; non-TTY and `NO_COLOR` environments fall back to plain ASCII.
