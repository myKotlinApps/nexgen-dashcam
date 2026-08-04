import { describe, expect, it } from "vitest";
import {
  extractRegionCode,
  formatPlateFa,
  isValidPersianPlate,
  normalizePlate,
  parsePlate,
} from "../src/plate";

// Reference plate from the physical sample sheet: ۱۲ ث ۳۴۵ | ایران ۱۱
describe("parsePlate", () => {
  it("reads the province code from the trailing pair, not the prefix", () => {
    const plate = parsePlate("۱۲ ث ۳۴۵ | ایران ۱۱");
    expect(plate).not.toBeNull();
    expect(plate!.prefix).toBe("12");
    expect(plate!.series).toBe("ث");
    expect(plate!.serial).toBe("345");
    expect(plate!.regionCode).toBe("11");
    expect(plate!.canonical).toBe("12ث345-11");
    expect(plate!.plateType).toBe("private");
  });

  it("accepts multi-character series such as الف", () => {
    const plate = parsePlate("۱۲ الف ۳۴۵ ایران ۱۱");
    expect(plate?.series).toBe("الف");
    expect(plate?.regionCode).toBe("11");
  });

  it("classifies Latin series letters", () => {
    expect(parsePlate("12 D 345 11")?.plateType).toBe("diplomatic");
    expect(parsePlate("12 S 345 11")?.plateType).toBe("embassy");
    expect(parsePlate("87 A 546 10")?.plateType).toBe("autoClub");
  });

  it("classifies the ژ disabled-driver series", () => {
    expect(parsePlate("۱۲ ژ ۳۴۵ ۱۱")?.plateType).toBe("disabled");
  });

  it("parses free-zone plates that carry no series letter", () => {
    const plate = parsePlate("42573 14");
    expect(plate?.plateType).toBe("freeZone");
    expect(plate?.serial).toBe("42573");
    expect(plate?.regionCode).toBe("14");
    expect(plate?.series).toBe("");
  });

  it("rejects malformed input", () => {
    expect(parsePlate("1234")).toBeNull();
    expect(parsePlate("abc")).toBeNull();
    expect(parsePlate("")).toBeNull();
    // م is not a two-letter series and the digit groups are the wrong length
    expect(parsePlate("1م2م")).toBeNull();
  });

  it("rejects unknown series letters", () => {
    expect(parsePlate("12 ح 345 11")).toBeNull();
  });
});

describe("normalizePlate", () => {
  it("produces one canonical form for every separator style", () => {
    const expected = "12ث345-11";
    expect(normalizePlate("۱۲ث۳۴۵۱۱")).toBe(expected);
    expect(normalizePlate("12 ث 345 - 11")).toBe(expected);
    expect(normalizePlate("۱۲ | ث | ۳۴۵ | ۱۱")).toBe(expected);
    expect(normalizePlate("۱۲–ث–۳۴۵–۱۱")).toBe(expected);
    expect(normalizePlate("  ایران ۱۱  ۱۲ ث ۳۴۵ ")).toBe(expected);
  });

  it("repairs common OCR letter confusions", () => {
    expect(normalizePlate("12ي34511")).toBe("12ی345-11");
    expect(normalizePlate("12ك34511")).toBe("12ک345-11");
    expect(normalizePlate("12ة34511")).toBe("12ه345-11");
  });

  it("converts Arabic-Indic digits", () => {
    expect(normalizePlate("١٢ث٣٤٥١١")).toBe("12ث345-11");
  });

  it("returns cleaned text instead of throwing on unparseable input", () => {
    expect(normalizePlate("???")).toBe("???");
  });
});

describe("extractRegionCode", () => {
  it("returns the province code", () => {
    expect(extractRegionCode("۱۲ ث ۳۴۵ ایران ۱۱")).toBe("11");
    expect(extractRegionCode("32ب123-45")).toBe("45");
  });

  it("returns null when the plate cannot be parsed", () => {
    expect(extractRegionCode("nonsense")).toBeNull();
  });
});

describe("isValidPersianPlate", () => {
  it("accepts real plate shapes", () => {
    expect(isValidPersianPlate("12ث345-11")).toBe(true);
    expect(isValidPersianPlate("۱۲ س ۴۵۶ ۷۸")).toBe(true);
  });

  it("rejects the two-letter shape that never occurs on Iranian plates", () => {
    expect(isValidPersianPlate("11ب123ب45")).toBe(false);
  });
});

describe("formatPlateFa", () => {
  it("renders Persian digits with the ایران box", () => {
    expect(formatPlateFa("12ث345-11")).toBe("۱۲ ث ۳۴۵ | ایران ۱۱");
  });

  it("omits the series for free-zone plates", () => {
    expect(formatPlateFa("42573-14")).toBe("۴۲۵۷۳ | ایران ۱۴");
  });
});
