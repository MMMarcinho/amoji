# amoji — sticker skill

You have access to `amoji`, a local CLI sticker manager. Use it to find, show, and manage emoji/sticker assets stored in `~/.amoji/`.

## When to use amoji

Use amoji when the user asks you to:
- React to something with a sticker or emoji
- Express an emotion or attitude visually
- Find a relevant sticker for a given context
- Add, tag, or organise their sticker collection

## Workflow: find and use a sticker

1. **Search** for a relevant sticker:
   ```
   amoji search <keywords>
   ```
   Try a few different terms if the first search returns nothing.

2. **Inspect** a candidate:
   ```
   amoji info <name|id>
   ```

3. **Show** the sticker (also marks it as used):
   ```
   amoji show <name|id>
   ```
   For ASCII stickers this outputs the art directly. For image stickers it outputs the absolute file path — include it in a markdown image tag: `![name](path)`.

4. If nothing fits, tell the user and suggest they add one with `amoji add` or `amoji ascii`.

## Workflow: add a new sticker

**Image file:**
```
amoji add <name> <path-to-file> -k "keyword1,keyword2" -d "what it expresses"
```

**ASCII art from a text file:**
```
amoji ascii <name> -f <path-to-file> -k "keyword1,keyword2" -d "what it expresses"
```

Always supply `-k` and `-d` so the sticker is discoverable via search.

## Useful commands

| Goal | Command |
|---|---|
| Search | `amoji search "happy excited"` |
| List all | `amoji list` |
| List ASCII only | `amoji list --type ascii` |
| Show keywords | `amoji keywords` |
| Recently used | `amoji recent` |
| Most popular | `amoji popular` |
| Sticker details | `amoji info <name\|id>` |
| Add keywords | `amoji tag <name\|id> "kw1,kw2" --append` |
| Set description | `amoji desc <name\|id> "text"` |
| Delete | `amoji delete <name\|id>` |

## Tips

- Sticker names and IDs are interchangeable in all commands.
- `show` increments the usage counter; `info` does not — use `info` when just browsing.
- Search uses FTS with automatic fallback to LIKE, so partial matches and multi-word queries work.
- If a name is already taken, amoji appends a timestamp automatically.
