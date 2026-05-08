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

If nothing matches, try a different query or tell the user no sticker fits.

## Add a sticker

```bash
# Image file
amoji add <name> <path> -k "kw1,kw2" -d "what it expresses"

# ASCII art from a text file
amoji ascii <name> -f <path> -k "kw1,kw2" -d "what it expresses"
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
| Metadata only | `amoji info <name\|id>` |
| Append keywords | `amoji tag <name\|id> "kw1,kw2" --append` |
| Set description | `amoji desc <name\|id> "text"` |
| Delete | `amoji delete <name\|id>` |

## Notes

- Names and numeric IDs are interchangeable in all commands.
- `show` increments the usage counter; `info` does not.
- Search uses FTS with automatic LIKE fallback — partial matches and multi-word queries work.
- Duplicate names get a timestamp suffix automatically.
