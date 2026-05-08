import * as readline from "readline";

interface PaletteEntry {
  char: string;
  name: string;
}

const PALETTE: PaletteEntry[] = [
  { char: "█", name: "full" },
  { char: "▓", name: "dark" },
  { char: "▒", name: "med" },
  { char: "░", name: "light" },
  { char: "●", name: "dot" },
  { char: "○", name: "ring" },
  { char: "◆", name: "diam" },
  { char: "■", name: "sq" },
  { char: "▲", name: "tri" },
  { char: "▼", name: "tri2" },
];

const EMPTY = " ";
const EMPTY_DISPLAY = "·";

function render(
  grid: string[][],
  cursorR: number,
  cursorC: number,
  currentIdx: number,
  rows: number,
  cols: number,
  message: string
): string {
  let out = "\x1b[2J\x1b[H\x1b[?25l";

  out += `\n  ASCII Art Editor  ${cols}x${rows}  |  `;
  out += `Color: [${currentIdx + 1}] ${PALETTE[currentIdx].char} (${PALETTE[currentIdx].name})`;
  out += "\n\n";

  // Column header
  out += "  ";
  for (let c = 0; c < cols; c++) out += `${c % 10} `;
  out += "\n";

  // Grid
  for (let r = 0; r < rows; r++) {
    out += `${r % 10} `;
    for (let c = 0; c < cols; c++) {
      const display = grid[r][c] === EMPTY ? EMPTY_DISPLAY : grid[r][c];
      if (r === cursorR && c === cursorC) {
        out += `\x1b[7m${display}\x1b[0m `;
      } else {
        out += `${display} `;
      }
    }
    out += "\n";
  }

  // Palette
  out += "\n  ";
  for (let i = 0; i < PALETTE.length; i++) {
    const p = PALETTE[i];
    if (i === currentIdx) {
      out += `\x1b[7m ${i + 1}:${p.char} \x1b[0m `;
    } else {
      out += ` ${i + 1}:${p.char} `;
    }
  }

  out += "\n\n";
  out += "  WASD/Arrows: move   Space/Enter: draw   C: clear cell   X: clear all\n";
  out += "  1-9,0: pick color   S: save & quit   Q / Ctrl+C: quit\n";
  if (message) {
    out += `\n  \x1b[33m${message}\x1b[0m`;
  }

  return out;
}

export function runEditor(rows: number, cols: number): Promise<string | null> {
  return new Promise((resolve) => {
    const grid: string[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => EMPTY)
    );

    let cursorR = 0;
    let cursorC = 0;
    let currentIdx = 0;
    let message = "";
    let escapeBuf = "";

    function redraw(msg = "") {
      message = msg;
      process.stdout.write(render(grid, cursorR, cursorC, currentIdx, rows, cols, message));
    }

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\x1b[?25h");
      process.stdout.write("\x1b[2J\x1b[H");
    }

    function moveCursor(dir: string) {
      switch (dir) {
        case "A": cursorR = Math.max(0, cursorR - 1); break;
        case "B": cursorR = Math.min(rows - 1, cursorR + 1); break;
        case "C": cursorC = Math.min(cols - 1, cursorC + 1); break;
        case "D": cursorC = Math.max(0, cursorC - 1); break;
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    redraw();

    process.stdin.on("data", (data: Buffer) => {
      const raw = data.toString();

      // Building an escape sequence
      if (escapeBuf) {
        escapeBuf += raw;
        const m = escapeBuf.match(/^\x1b\[([ABCD])$/);
        if (m) {
          moveCursor(m[1]);
          escapeBuf = "";
          redraw();
          return;
        }
        if (escapeBuf.length >= 5) {
          escapeBuf = "";
          redraw("Unknown key");
          return;
        }
        return;
      }

      if (raw === "\x1b") {
        escapeBuf = "\x1b";
        return;
      }

      // Full arrow key sequence
      const arrowMatch = raw.match(/^\x1b\[([ABCD])$/);
      if (arrowMatch) {
        moveCursor(arrowMatch[1]);
        redraw();
        return;
      }

      const key = raw.toLowerCase();
      let msg = "";

      switch (key) {
        case "w": moveCursor("A"); break;
        case "s": moveCursor("B"); break;
        case "a": moveCursor("D"); break;
        case "d": moveCursor("C"); break;
        case " ":
        case "\r":
          grid[cursorR][cursorC] = PALETTE[currentIdx].char;
          msg = `Drew ${PALETTE[currentIdx].name} at (${cursorR},${cursorC})`;
          break;
        case "c":
          grid[cursorR][cursorC] = EMPTY;
          msg = `Cleared (${cursorR},${cursorC})`;
          break;
        case "x":
          for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
              grid[r][c] = EMPTY;
          msg = "Cleared all cells";
          break;
        case "s":
          {
            const art = grid.map((row) => row.join("")).join("\n");
            cleanup();
            resolve(art);
          }
          return;
        case "q":
        case "\x03":
          cleanup();
          resolve(null);
          return;
        default:
          {
            const num = parseInt(raw);
            if (num >= 0 && num <= 9) {
              const idx = num === 0 ? 9 : num - 1;
              if (idx < PALETTE.length) {
                currentIdx = idx;
                msg = `Switched to color: ${PALETTE[idx].name}`;
              }
            }
          }
          break;
      }

      redraw(msg);
    });
  });
}
