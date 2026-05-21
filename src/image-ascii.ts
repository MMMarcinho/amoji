import { Jimp, intToRGBA } from "jimp";

export type AsciiColorMode = "auto" | "none" | "ansi16" | "ansi256" | "truecolor";
export type AsciiCharsetName = "standard" | "dense" | "minimal" | "binary";

export interface ImageToAsciiOptions {
  width?: number;
  height?: number;
  colorMode?: AsciiColorMode;
  /** Backward-compatible alias: false means colorMode "none". */
  color?: boolean;
  charset?: AsciiCharsetName;
  chars?: string;
  background?: boolean;
  invert?: boolean;
}

const CHARSETS: Record<AsciiCharsetName, string> = {
  standard: "@%#*+=-:. ",
  dense: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  minimal: "@#*:. ",
  binary: "# ",
};

const ANSI16 = [
  { code: 30, r: 0, g: 0, b: 0 },
  { code: 31, r: 128, g: 0, b: 0 },
  { code: 32, r: 0, g: 128, b: 0 },
  { code: 33, r: 128, g: 128, b: 0 },
  { code: 34, r: 0, g: 0, b: 128 },
  { code: 35, r: 128, g: 0, b: 128 },
  { code: 36, r: 0, g: 128, b: 128 },
  { code: 37, r: 192, g: 192, b: 192 },
  { code: 90, r: 128, g: 128, b: 128 },
  { code: 91, r: 255, g: 0, b: 0 },
  { code: 92, r: 0, g: 255, b: 0 },
  { code: 93, r: 255, g: 255, b: 0 },
  { code: 94, r: 0, g: 0, b: 255 },
  { code: 95, r: 255, g: 0, b: 255 },
  { code: 96, r: 0, g: 255, b: 255 },
  { code: 97, r: 255, g: 255, b: 255 },
];

function brightness(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function toChar(lum: number, ramp: string): string {
  const idx = Math.floor((lum / 255) * (ramp.length - 1));
  return ramp[idx] || " ";
}

function resolveRamp(opts: ImageToAsciiOptions): string {
  if (opts.chars) {
    const chars = [...opts.chars].join("");
    if (chars.length >= 2) return chars;
  }
  return CHARSETS[opts.charset || "standard"];
}

function resolveColorMode(mode: AsciiColorMode | undefined, color: boolean | undefined): Exclude<AsciiColorMode, "auto"> {
  if (color === false) return "none";

  const requested = mode || "auto";
  if (requested !== "auto") return requested;

  const env = process.env;
  if (!process.stdout.isTTY || env.NO_COLOR || env.TERM === "dumb") return "none";
  if (env.FORCE_COLOR === "3" || /truecolor|24bit/i.test(env.COLORTERM || "")) {
    return "truecolor";
  }
  if (env.FORCE_COLOR === "2" || /256color/i.test(env.TERM || "")) return "ansi256";
  if (env.FORCE_COLOR || env.TERM) return "ansi16";
  return "none";
}

function rgbToAnsi256(r: number, g: number, b: number): number {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }

  const rc = Math.round((r / 255) * 5);
  const gc = Math.round((g / 255) * 5);
  const bc = Math.round((b / 255) * 5);
  return 16 + 36 * rc + 6 * gc + bc;
}

function rgbToAnsi16(r: number, g: number, b: number): number {
  let best = ANSI16[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of ANSI16) {
    const distance =
      (candidate.r - r) ** 2 +
      (candidate.g - g) ** 2 +
      (candidate.b - b) ** 2;
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best.code;
}

function toAnsi(
  r: number,
  g: number,
  b: number,
  mode: Exclude<AsciiColorMode, "auto">,
  background: boolean
): string {
  if (mode === "none") return "";
  if (mode === "truecolor") {
    return `\x1b[${background ? 48 : 38};2;${r};${g};${b}m`;
  }
  if (mode === "ansi256") {
    return `\x1b[${background ? 48 : 38};5;${rgbToAnsi256(r, g, b)}m`;
  }

  const fg = rgbToAnsi16(r, g, b);
  const code = background ? fg + 10 : fg;
  return `\x1b[${code}m`;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export async function imageToAscii(
  filePath: string,
  opts: ImageToAsciiOptions = {}
): Promise<string> {
  const img = await Jimp.read(filePath);
  const ramp = resolveRamp(opts);
  const mode = resolveColorMode(opts.colorMode, opts.color);
  const background = opts.background ?? false;

  // Terminal cells are commonly about twice as tall as they are wide.
  let targetW = opts.width;
  let targetH = opts.height;
  if (!targetW && !targetH) targetW = 80;
  if (targetW && !targetH) targetH = img.height * (targetW / img.width) * 0.5;
  if (targetH && !targetW) targetW = img.width * (targetH / img.height) * 2;

  targetW = clampInt(targetW || 80, 1, 400);
  targetH = clampInt(targetH || 1, 1, 240);
  img.resize({ w: targetW, h: targetH });

  const lines: string[] = [];
  for (let y = 0; y < img.height; y++) {
    let line = "";
    let lastAnsi = "";
    for (let x = 0; x < img.width; x++) {
      const { r, g, b, a } = intToRGBA(img.getPixelColor(x, y));
      if (a < 128) {
        if (lastAnsi) {
          line += "\x1b[0m";
          lastAnsi = "";
        }
        line += " ";
        continue;
      }

      const rawLum = brightness(r, g, b);
      const lum = opts.invert ? 255 - rawLum : rawLum;
      const ch = toChar(lum, ramp);
      const ansi = toAnsi(r, g, b, mode, background);

      if (ansi !== lastAnsi) {
        line += ansi || (lastAnsi ? "\x1b[0m" : "");
        lastAnsi = ansi;
      }
      line += ch;
    }
    if (lastAnsi) {
      line += "\x1b[0m";
    }
    lines.push(line);
  }

  return lines.join("\n");
}
