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

3. **Show** or **Use** the sticker (both mark it as used):
   ```
   amoji show <name|id>           # raw content — best for piping
   amoji use <name|id>            # structured output: file path, type, name, count
   amoji use <name|id> --base64   # same + base64 data URI for image stickers
   ```
   For ASCII stickers, `show` outputs the art directly, `use` prints `key:value` metadata then the art after `───`.
   For image stickers, `show` outputs just the file path. `use` outputs `file:<path>`, `type:image`, `name:<name>`, `count:<n>`, and with `--base64` also `base64:<data-uri>`.

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
| Show content (raw) | `amoji show <name\|id>` |
| Use + structured output | `amoji use <name\|id> [--base64]` |
| Sticker details | `amoji info <name\|id>` |
| Add keywords | `amoji tag <name\|id> "kw1,kw2" --append` |
| Set description | `amoji desc <name\|id> "text"` |
| Delete | `amoji delete <name\|id>` |

## Tips

- Sticker names and IDs are interchangeable in all commands.
- `show` and `use` both increment the usage counter; `info` does not — use `info` when just browsing.
- `use` returns structured `key:value` output (`file:`, `type:`, `name:`, `count:`, optionally `base64:`). Image stickers with `--base64` return a full data URI ready for markdown embedding.
- Search uses FTS with automatic fallback to LIKE, so partial matches and multi-word queries work.
- If a name is already taken, amoji appends a timestamp automatically.
