import { parsePlate, type RegionEntry } from "@nexgen/core";

/**
 * Maps the 2-digit province code printed inside the ایران box to a
 * province/city. Several provinces own multiple codes, and within one code the
 * series letter can narrow the result to a specific county — for example code
 * 83 is Fars, where م is Larestan and ه is Jahrom.
 */
export class RegionDatabase {
  private byCode = new Map<string, RegionEntry[]>();
  private version = 0;

  load(data: RegionEntry[], version: number): void {
    this.byCode.clear();
    for (const entry of data) {
      const bucket = this.byCode.get(entry.regionCode);
      if (bucket) bucket.push(entry);
      else this.byCode.set(entry.regionCode, [entry]);
    }
    this.version = version;
  }

  getVersion(): number {
    return this.version;
  }

  /** All entries registered for a province code, optionally filtered by series. */
  lookup(regionCode: string, series?: string): RegionEntry[] {
    const candidates = this.byCode.get(regionCode) ?? [];
    if (!series) return candidates;

    const narrowed = candidates.filter((entry) => {
      if (!entry.letterRange) return false;
      const [from, to] = entry.letterRange;
      return series >= from && series <= to;
    });

    // Fall back to the province-level entries when no county matches.
    return narrowed.length > 0 ? narrowed : candidates;
  }

  /** Resolve a full plate string to its most specific region entry. */
  lookupByPlate(plate: string): RegionEntry | null {
    const parsed = parsePlate(plate);
    if (!parsed) return null;
    const matches = this.lookup(parsed.regionCode, parsed.series || undefined);
    return matches[0] ?? null;
  }

  getProvinces(): string[] {
    const provinces = new Set<string>();
    for (const entries of this.byCode.values()) {
      for (const entry of entries) provinces.add(entry.province);
    }
    return [...provinces].sort();
  }

  getRegionCodes(): string[] {
    return [...this.byCode.keys()].sort();
  }
}

// Plate parsing helpers live in @nexgen/core so the native modules, the app and
// the dashboard all agree on one canonical format.
export {
  normalizePlate,
  isValidPersianPlate,
  extractRegionCode,
  parsePlate,
  formatPlateFa,
} from "@nexgen/core";
