import { describe, it, expect } from "vitest";
import { formatUSD, formatPct } from "../providers/coingecko.js";

describe("CoinGecko formatUSD", () => {
  it("formats trillions", () => {
    expect(formatUSD(2.5e12)).toBe("$2.50T");
  });

  it("formats billions", () => {
    expect(formatUSD(1.234e9)).toBe("$1.23B");
  });

  it("formats millions", () => {
    expect(formatUSD(456e6)).toBe("$456.00M");
  });

  it("formats thousands", () => {
    expect(formatUSD(7890)).toBe("$7.89K");
  });

  it("formats small values", () => {
    expect(formatUSD(42.5)).toBe("$42.50");
  });

  it("formats zero", () => {
    expect(formatUSD(0)).toBe("$0.00");
  });
});

describe("CoinGecko formatPct", () => {
  it("formats positive percentage", () => {
    expect(formatPct(5.6)).toBe("+5.6%");
  });

  it("formats negative percentage", () => {
    expect(formatPct(-3.2)).toBe("-3.2%");
  });

  it("formats zero", () => {
    expect(formatPct(0)).toBe("+0.0%");
  });

  it("returns N/A for null", () => {
    expect(formatPct(null)).toBe("N/A");
  });

  it("returns N/A for undefined", () => {
    expect(formatPct(undefined)).toBe("N/A");
  });
});
