import { describe, expect, it } from "vitest";
import {
  computeAmount,
  currencyExponent,
  formatMoney,
  majorToMinor,
  minorToMajor,
} from "../src/lib/money";

describe("currency exponents", () => {
  it("treats UGX as zero-decimal", () => {
    expect(currencyExponent("UGX")).toBe(0);
    expect(minorToMajor(25000, "UGX")).toBe(25000);
    expect(formatMoney(25000, "UGX")).toBe("25,000 UGX");
  });

  it("treats NGN as two-decimal", () => {
    expect(currencyExponent("NGN")).toBe(2);
    expect(minorToMajor(2550, "NGN")).toBe(25.5);
    expect(formatMoney(2550, "NGN")).toBe("25.50 NGN");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(currencyExponent(" ugx ")).toBe(0);
    expect(currencyExponent("usd")).toBe(2);
  });

  it("defaults unknown currencies to two decimals", () => {
    expect(currencyExponent("XYZ")).toBe(2);
  });
});

describe("conversions", () => {
  it("round-trips major units", () => {
    for (const [major, currency] of [
      [25.5, "USD"],
      [0.01, "NGN"],
      [25000, "UGX"],
      [1234.56, "KES"],
    ] as const) {
      expect(minorToMajor(majorToMinor(major, currency), currency)).toBe(major);
    }
  });

  it("never leaves floating-point dust", () => {
    expect(majorToMinor(0.1 + 0.2, "USD")).toBe(30);
    expect(minorToMajor(30, "USD")).toBe(0.3);
  });

  it("multiplies unit price by quantity", () => {
    expect(computeAmount(25000, 3)).toBe(75000);
    expect(computeAmount(0, 10)).toBe(0);
  });
});
