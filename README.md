# amoji

Emoji/sticker manager for AI agents — collect, create, and search custom stickers stored locally.

## Installation

### Prerequisites

`better-sqlite3` is a native module and requires a C++ build toolchain:

| Platform | Requirement |
|---|---|
| **Windows** | [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with "Desktop development with C++" workload, or `npm install --global windows-build-tools` |
| **macOS** | Xcode Command Line Tools: `xcode-select --install` |
| **Linux** | `build-essential` + `python3`: `sudo apt install build-essential python3` |

### Setup

```bash
npm install
npm run build
npm link          # makes `amoji` available globally
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

**Create ASCII art interactively:**
```bash
amoji ascii <name> [-k keywords] [-d description] [-r rows] [-c cols]

amoji ascii shrug -k "whatever,meh" -d "indifferent shrug"
```

Use arrow keys to move the cursor, Space/Enter to draw, `1`–`9`/`0` to pick a block character, `C` to clear a cell, `X` to clear all, `S` to save, `Q` to quit without saving.

**Import ASCII art from a text file:**
```bash
amoji ascii shrug -f path/to/art.txt -k "whatever,meh"
```

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
```

For ASCII stickers this prints the art to stdout. For image stickers it prints the absolute file path.

**Show metadata only** (does not increment usage count):
```bash
amoji info <name|id>
```

**Mark as used and get structured output:**
```bash
amoji use <name|id>            # file path + metadata
amoji use <name|id> --base64   # also returns base64 data URI (images only)
```

Outputs structured `key:value` lines:

- `file:<absolute-path>` — always present
- `type:image|ascii` — always present
- `name:<name>` — always present
- `count:<n>` — usage count after marking
- `base64:<data-uri>` — only with `--base64` on image stickers
- `───` separator followed by raw ASCII art (ASCII only)

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
