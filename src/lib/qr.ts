import { toQR } from "toqr";
import { encodeGrayscalePng } from "./png";

export interface QrMatrix {
  size: number;
  modules: Uint8Array;
}

export function buildQrMatrix(content: string): QrMatrix {
  const modules = toQR(content);
  const size = Math.round(Math.sqrt(modules.length));
  if (size * size !== modules.length) {
    throw new Error(`unexpected QR matrix length: ${modules.length}`);
  }
  return { size, modules };
}

export function qrToSvg(
  matrix: QrMatrix,
  options: { scale?: number; margin?: number } = {},
): string {
  const scale = options.scale ?? 8;
  const margin = options.margin ?? 4;
  const { size, modules } = matrix;
  const dimension = (size + margin * 2) * scale;

  let path = "";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!modules[y * size + x]) continue;
      path += `M${(x + margin) * scale},${(y + margin) * scale}h${scale}v${scale}h-${scale}z`;
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension}" height="${dimension}"`,
    ` viewBox="0 0 ${dimension} ${dimension}" shape-rendering="crispEdges">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    `<path d="${path}" fill="#000000"/>`,
    `</svg>`,
  ].join("");
}

export function qrToPng(
  matrix: QrMatrix,
  options: { scale?: number; margin?: number } = {},
): Buffer {
  const scale = options.scale ?? 10;
  const margin = options.margin ?? 4;
  const { size, modules } = matrix;
  const side = (size + margin * 2) * scale;
  const pixels = new Uint8Array(side * side).fill(255);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!modules[y * size + x]) continue;
      const left = (x + margin) * scale;
      const top = (y + margin) * scale;
      for (let dy = 0; dy < scale; dy += 1) {
        const rowStart = (top + dy) * side;
        pixels.fill(0, rowStart + left, rowStart + left + scale);
      }
    }
  }

  return encodeGrayscalePng(side, side, pixels);
}
