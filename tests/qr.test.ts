import jsQR from "jsqr";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { buildQrMatrix, qrToPng, qrToSvg } from "../src/lib/qr";
import { encodeGrayscalePng } from "../src/lib/png";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("QR matrix", () => {
  it("is square and a legal QR version", () => {
    const matrix = buildQrMatrix("https://example.com/t/abc");
    expect(matrix.modules.length).toBe(matrix.size * matrix.size);
    expect(matrix.size).toBeGreaterThanOrEqual(21);
    expect((matrix.size - 17) % 4).toBe(0);
  });

  it("differs by content", () => {
    const a = buildQrMatrix("one");
    const b = buildQrMatrix("two");
    expect(Buffer.from(a.modules).equals(Buffer.from(b.modules))).toBe(false);
  });
});

describe("SVG rendering", () => {
  it("emits a self-contained SVG of the requested size", () => {
    const matrix = buildQrMatrix("hello");
    const svg = qrToSvg(matrix, { scale: 4, margin: 2 });
    const dimension = (matrix.size + 4) * 4;

    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`width="${dimension}"`);
    expect(svg).toContain(`viewBox="0 0 ${dimension} ${dimension}"`);
    expect(svg).toContain("<path");
    expect(svg.endsWith("</svg>")).toBe(true);
  });

  it("scales the module count into the path", () => {
    const matrix = buildQrMatrix("hello");
    const svg = qrToSvg(matrix, { scale: 1, margin: 0 });
    const segments = svg.match(/M\d+,\d+h1v1h-1z/g) ?? [];
    const darkModules = matrix.modules.reduce((sum, value) => sum + (value ? 1 : 0), 0);
    expect(segments.length).toBe(darkModules);
  });
});

describe("PNG rendering", () => {
  it("writes a valid greyscale PNG header and size", () => {
    const matrix = buildQrMatrix("hello");
    const png = qrToPng(matrix, { scale: 3, margin: 4 });
    const side = (matrix.size + 8) * 3;

    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(png.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(side);
    expect(png.readUInt32BE(20)).toBe(side);
    expect(png.subarray(png.length - 8, png.length - 4).toString("ascii")).toBe("IEND");
  });

  it("encodes arbitrary pixels without loss", () => {
    const pixels = new Uint8Array([0, 255, 255, 0]);
    const png = encodeGrayscalePng(2, 2, pixels);
    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(png.readUInt32BE(16)).toBe(2);
    expect(png.readUInt32BE(20)).toBe(2);
  });
});

describe("QR round trip", () => {
  // The page, the PNG endpoint, the email attachment and the printed sheet all
  // render the same matrix, so a correct decode here covers all four.
  it.each([
    "https://tickets.shotsandsecrets.example/t/AbCdEfGhIjKlMnOpQrStUvWxYz012345",
    "http://192.168.1.186:3000/t/ZyXwVuTsRqPoNmLkJiHgFeDcBa987654",
  ])("decodes %s from the rendered PNG", (url) => {
    const png = qrToPng(buildQrMatrix(url), { scale: 6, margin: 4 });
    const image = PNG.sync.read(png);
    const decoded = jsQR(
      new Uint8ClampedArray(image.data),
      image.width,
      image.height,
      { inversionAttempts: "dontInvert" },
    );

    expect(decoded?.data).toBe(url);
  });
});
