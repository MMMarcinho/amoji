# Skill: amoji

Use the `amoji` CLI to find, display, and manage a local sticker collection stored in `~/.amoji/`.

## When to use this skill

- The user asks you to react with a sticker or emoji
- You want to express an emotion or attitude visually
- The user asks you to search, add, tag, or delete stickers

## Find and show a sticker

```bash
# 1. Search by keyword, name, or description
amoji search <query>

# 2. Inspect a candidate without marking it as used
amoji info <name|id>

# 3. Show it (prints content and marks as used)
amoji show <name|id>
```

For ASCII stickers, `show` prints the art to stdout — output it inline.  
For image stickers, `show` prints the absolute file path — embed it as `![name](path)`.

### `use` — mark as used and get content

```bash
amoji use <name|id>           # returns file path + metadata
amoji use <name|id> --base64  # also returns base64-encoded image data
amoji use <name|id> --ascii   # renders an image sticker as terminal-safe ASCII
```

Outputs structured `key:value` lines followed by content body (for ASCII):

- `file:<absolute-path>` — always present
- `type:image|ascii` — always present
- `name:<name>` — always present
- `count:<n>` — usage count after marking
- `base64:<data-uri>` — only with `--base64` on image stickers
- `───` separator, then raw ASCII art (ASCII stickers, or image stickers with `--ascii`)

If nothing matches, try a different query or tell the user no sticker fits.

## Add a sticker

```bash
# Image file
amoji add <name> <path> -k "kw1,kw2" -d "what it expresses"

# ASCII art generated from an image
amoji ascii <name> <path> -k "kw1,kw2" -d "what it expresses" --width 80 --no-color
```

Always supply `-k` and `-d` so the sticker is searchable later.

## Quick reference

| Goal | Command |
|---|---|
| Search | `amoji search "happy excited"` |
| List all | `amoji list` |
| List ASCII only | `amoji list --type ascii` |
| Browse keywords | `amoji keywords` |
| Recently used | `amoji recent` |
| Most popular | `amoji popular` |
| Show content | `amoji show <name\|id>` |
| Use + structured output | `amoji use <name\|id> [--base64]` |
| Metadata only | `amoji info <name\|id>` |
| Append keywords | `amoji tag <name\|id> "kw1,kw2" --append` |
| Set description | `amoji desc <name\|id> "text"` |
| Delete | `amoji delete <name\|id>` |

## Notes

- Names and numeric IDs are interchangeable in all commands.
- `show` prints raw content (ASCII art or file path); `use` prints structured `key:value` lines + optional `--base64` data URI. Both increment the usage counter.
- Search uses FTS with automatic LIKE fallback — partial matches and multi-word queries work.
- Duplicate names get a timestamp suffix automatically.
