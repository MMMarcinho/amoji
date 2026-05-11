import { Jimp, intToRGBA } from "jimp";

// Darkest → lightest; two chars per "pixel" so columns look square in most terminals
const RAMP = "@%#S?*+;:,. ";

function brightness(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function toChar(lum: number): string {
  const idx = Math.floor((lum / 255) * (RAMP.length - 1));
  return RAMP[idx];
}

export async function imageToAscii(
  filePath: string,
  opts: { width?: number; color?: boolean } = {}
): Promise<string> {
  const targetW = opts.width ?? 80;
  const useColor = opts.color ?? true;

  const img = await Jimp.read(filePath);

  // Terminal chars are roughly 2× taller than wide, so halve the row count
  const scale = targetW / img.width;
  const targetH = Math.max(1, Math.round(img.height * scale * 0.5));
  img.resize({ w: targetW, h: targetH });

  const lines: string[] = [];
  for (let y = 0; y < img.height; y++) {
    let line = "";
    for (let x = 0; x < img.width; x++) {
      const { r, g, b, a } = intToRGBA(img.getPixelColor(x, y));
      const lum = a < 128 ? 255 : brightness(r, g, b);
      const ch = toChar(lum);

      if (useColor && a >= 128) {
        line += `\x1b[38;2;${r};${g};${b}m${ch}\x1b[0m`;
      } else {
        line += ch;
      }
    }
    lines.push(line);
  }

  return lines.join("\n");
}
