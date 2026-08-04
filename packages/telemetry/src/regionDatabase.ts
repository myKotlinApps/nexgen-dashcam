import type { RegionEntry } from "@nexgen/core";

export class RegionDatabase {
  private entries: RegionEntry[] = [];
  private version = 0;

  load(data: RegionEntry[], version: number): void {
    this.entries = data;
    this.version = version;
  }

  getVersion(): number { return this.version; }

  lookup(regionCode: string, letter?: string): RegionEntry[] {
    return this.entries.filter((entry) => {
      if (entry.regionCode !== regionCode) return false;
      if (!entry.letterRange || !letter) return true;
      const [from, to] = entry.letterRange;
      return letter >= from && letter <= to;
    });
  }

  getProvinces(): string[] {
    return [...new Set(this.entries.map((e) => e.province))];
  }

  getRegionCodes(): string[] {
    return [...new Set(this.entries.map((e) => e.regionCode))];
  }
}

export function normalizePlate(raw: string): string {
  let normalized = raw
    .replace(/\s+/g, "")
    .replace(/[|\-–—]/g, "-")
    .replace(/[۰۱۲۳۴۵۶۷۸۹]/g, (d) => {
      const map: Record<string, string> = {
        "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
        "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
      };
      return map[d] ?? d;
    })
    .replace(/[يى]/g, "ی")
    .replace(/[ك]/g, "ک")
    .toLowerCase();
  return normalized;
}

export function isValidPersianPlate(normalized: string): boolean {
  const pattern =
    /^(\d{2})[\-]?([\u0600-\u06FF])[\-]?(\d{3})[\-]?([\u0600-\u06FF]\d{2})$/;
  return pattern.test(normalized);
}
