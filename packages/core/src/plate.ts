// Iranian (Persian) license plate parsing — single source of truth.
//
// Physical layout of a standard private plate:
//
//   ┌──────────────────────────┬─────────┐
//   │   ۱۲   ث   ۳۴۵           │  ایران  │
//   │                          │   ۱۱    │
//   └──────────────────────────┴─────────┘
//     ^^   ^    ^^^                ^^
//     |    |    |                  └─ regionCode (province), 2 digits
//     |    |    └─ serial, 3 digits
//     |    └─ series letter(s), 1-3 Persian chars or 1-2 Latin
//     └─ prefix, 2 digits
//
// Wikipedia notation for this is `## X ### - NN`.
// The region code is the TRAILING pair, inside the ایران box on the right.
// Canonical normalized string used throughout the app: "12ث345-11".

export type PlateType =
  | "private"
  | "diplomatic"
  | "embassy"
  | "disabled"
  | "autoClub"
  | "freeZone";

export interface ParsedPlate {
  /** Canonical form, e.g. "12ث345-11" or "42573-14" for free zones. */
  canonical: string;
  /** Leading 2 digits. Empty for free-zone plates. */
  prefix: string;
  /** Series letter(s), e.g. "ث", "الف", "D". Empty for free-zone plates. */
  series: string;
  /** Trailing 3 digits of the registration code. */
  serial: string;
  /** Province/region code — the 2 digits inside the ایران box. */
  regionCode: string;
  plateType: PlateType;
}

/** Persian series letters valid on civilian plates. */
export const PERSIAN_SERIES_LETTERS = [
  "الف", "ب", "پ", "ت", "ث", "ج", "د", "ز", "ژ", "س", "ش",
  "ص", "ط", "ع", "ف", "ق", "ک", "گ", "ل", "م", "ن", "و", "ه", "ی",
] as const;

/** Latin series letters: D = diplomatic, S = embassy, A = auto club. */
export const LATIN_SERIES_LETTERS = ["D", "S", "A"] as const;

/** ژ is reserved for vehicles adapted for drivers with disabilities. */
const DISABLED_SERIES = "ژ";

export const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/** Persian (U+06Fx) and Arabic-Indic (U+066x) digits both appear in OCR output. */
const DIGIT_MAP: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

/**
 * Characters an OCR model commonly confuses on Persian plates.
 * Left side is the misread glyph, right side the canonical Persian form.
 */
export const OCR_CONFUSIONS: Record<string, string> = {
  "ي": "ی", "ى": "ی", "ے": "ی",   // yeh variants
  "ك": "ک",                     // arabic kaf
  "ة": "ه", "ە": "ه",           // teh marbuta / ae
  "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", // alef with hamza/madda
  "ؤ": "و",                     // waw with hamza
  "گ": "گ", "ک": "ک",
};

/** Standard plate: 2 digits + 1-3 series chars + 3 digits + 2 digit region. */
const STANDARD_RE = /^(\d{2})([^\d]{1,3})(\d{3})(\d{2})$/u;

/** Free-zone plate: 5 digits + 2 digit zone code, no series letter. */
const FREE_ZONE_RE = /^(\d{5})(\d{2})$/u;

/** Matches a canonical plate string, e.g. "12ث345-11". */
export const PERSIAN_PLATE_REGEX = /^(\d{2})([^\d-]{1,3})(\d{3})-(\d{2})$/u;

/** Convert Latin digits to Persian for display. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

/** Convert Persian/Arabic-Indic digits to Latin. */
export function toLatinDigits(input: string): string {
  return input.replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (d) => DIGIT_MAP[d] ?? d);
}

/**
 * Reduce raw OCR text to a comparable canonical plate string.
 *
 * Returns the canonical form when the text is a recognizable plate, otherwise
 * the cleaned-up text so callers can log or debug the failed read.
 */
export function normalizePlate(raw: string): string {
  const stripped = stripPlateText(raw);
  const parsed = parseStripped(stripped);
  return parsed ? parsed.canonical : stripped;
}

/** Parse raw OCR text into structured plate fields, or null if invalid. */
export function parsePlate(raw: string): ParsedPlate | null {
  return parseStripped(stripPlateText(raw));
}

export function isValidPersianPlate(raw: string): boolean {
  return parsePlate(raw) !== null;
}

/**
 * Extract only the province/region code (the digits in the ایران box).
 * This is the value used for city/province lookups.
 */
export function extractRegionCode(raw: string): string | null {
  return parsePlate(raw)?.regionCode ?? null;
}

/** Render a plate for Persian UI, e.g. "۱۲ ث ۳۴۵ | ایران ۱۱". */
export function formatPlateFa(plate: ParsedPlate | string): string {
  const parsed = typeof plate === "string" ? parsePlate(plate) : plate;
  if (!parsed) return typeof plate === "string" ? plate : "";
  if (parsed.plateType === "freeZone") {
    return `${toPersianDigits(parsed.serial)} | ایران ${toPersianDigits(parsed.regionCode)}`;
  }
  return (
    `${toPersianDigits(parsed.prefix)} ${parsed.series} ` +
    `${toPersianDigits(parsed.serial)} | ایران ${toPersianDigits(parsed.regionCode)}`
  );
}

// ─── internals ───────────────────────────────────────────

/**
 * Remove country markings, separators and diacritics, unify confusable
 * letters, and convert digits to Latin — leaving a bare token stream.
 */
function stripPlateText(raw: string): string {
  let s = raw.normalize("NFKC");

  // Country markings printed on the plate but not part of the number.
  s = s.replace(/ایران/g, "");
  s = s.replace(/I\.?\s?R\.?\s?(IRAN)?/gi, "");
  s = s.replace(/IRAN/gi, "");

  s = toLatinDigits(s);

  // Zero-width joiner / non-joiner appear inside ه‍ and الف.
  s = s.replace(/[\u200B-\u200F\u202A-\u202E]/g, "");

  // Arabic diacritics and tatweel.
  s = s.replace(/[\u064B-\u0652\u0640]/g, "");

  s = Array.from(s)
    .map((ch) => OCR_CONFUSIONS[ch] ?? ch)
    .join("");

  // Every separator style seen on plates and in OCR output.
  s = s.replace(/[\s|\-–—_.,·•/\\]+/g, "");

  return s.toUpperCase();
}

function parseStripped(s: string): ParsedPlate | null {
  const standard = STANDARD_RE.exec(s);
  if (standard) {
    const [, prefix, seriesRaw, serial, regionCode] = standard;
    const series = seriesRaw!;
    if (!isKnownSeries(series)) return null;
    return {
      canonical: `${prefix}${series}${serial}-${regionCode}`,
      prefix: prefix!,
      series,
      serial: serial!,
      regionCode: regionCode!,
      plateType: classifySeries(series),
    };
  }

  const freeZone = FREE_ZONE_RE.exec(s);
  if (freeZone) {
    const [, serial, regionCode] = freeZone;
    return {
      canonical: `${serial}-${regionCode}`,
      prefix: "",
      series: "",
      serial: serial!,
      regionCode: regionCode!,
      plateType: "freeZone",
    };
  }

  return null;
}

function isKnownSeries(series: string): boolean {
  return (
    (PERSIAN_SERIES_LETTERS as readonly string[]).includes(series) ||
    (LATIN_SERIES_LETTERS as readonly string[]).includes(series)
  );
}

function classifySeries(series: string): PlateType {
  if (series === "D") return "diplomatic";
  if (series === "S") return "embassy";
  if (series === "A") return "autoClub";
  if (series === DISABLED_SERIES) return "disabled";
  return "private";
}
