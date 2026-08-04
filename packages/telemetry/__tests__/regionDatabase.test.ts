import { describe, it, expect } from "vitest";
import { normalizePlate, isValidPersianPlate } from "../src/regionDatabase";

describe("normalizePlate", () => {
  it("normalizes Persian digits", () => {
    expect(normalizePlate("۱۲۳ ب ۴۵")).toBe("123ب45");
  });

  it("removes spaces and normalizes separators", () => {
    expect(normalizePlate("11 | 123 ب 45")).toBe("11-123ب45");
    expect(normalizePlate("۱۱–۱۲۳–ب–۴۵")).toBe("11-123ب45");
  });

  it("normalizes character confusions", () => {
    expect(normalizePlate("11ي123ب45")).toBe("11ی123ب45");
    expect(normalizePlate("11ك123ب45")).toBe("11ک123ب45");
  });

  it("handles mixed input", () => {
    expect(normalizePlate("ایران 11 | ۱۲۳ ب ۴۵")).toBe("ایران11-123ب45");
  });
});

describe("isValidPersianPlate", () => {
  it("validates correct format", () => {
    expect(isValidPersianPlate("11ب123ب45")).toBe(true);
    expect(isValidPersianPlate("12س456د78")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidPersianPlate("1234")).toBe(false);
    expect(isValidPersianPlate("abc")).toBe(false);
  });
});
