import { describe, expect, it } from "vitest";
import { formatMoney, toCents, validateAmount } from "./money";

describe("validateAmount", () => {
  it("accepts valid decimal strings", () => {
    for (const ok of ["0.01", "1", "12.5", "999999.99", " 5.00 "])
      expect(validateAmount(ok)).toBeNull();
  });

  it("rejects empty, zero, too precise, too large, signed and exponent values", () => {
    for (const bad of [
      "",
      "0",
      "0.00",
      "1.234",
      "1000000",
      "-1",
      "1e3",
      "1,5",
      "abc",
      ".5",
    ]) {
      expect(validateAmount(bad)).not.toBeNull();
    }
  });
});

describe("toCents", () => {
  it("converts without float rounding", () => {
    expect(toCents("0.10")).toBe(10n);
    expect(toCents("1000.1")).toBe(100010n);
    expect(toCents("999999.99")).toBe(99999999n);
  });
});

describe("formatMoney", () => {
  it("pads to two decimals and groups thousands without floats", () => {
    expect(formatMoney("12.5")).toBe("12.50");
    expect(formatMoney("1234567")).toBe("1,234,567.00");
    expect(formatMoney("999999.99")).toBe("999,999.99");
    expect(formatMoney("0.10")).toBe("0.10");
  });

  it("returns unexpected input unchanged", () => {
    expect(formatMoney("abc")).toBe("abc");
  });
});
