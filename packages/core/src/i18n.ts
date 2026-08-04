// Locale-aware formatting helpers.
//
// This package is consumed by both the Expo app and the Next.js dashboard, so
// it must stay free of native modules. Platform locale detection belongs in the
// app layer (see apps/mobile/src/i18n/locale.ts); pass the resulting language
// tag into these helpers.

import { toLatinDigits, toPersianDigits } from "./plate";

export type TextDirection = "rtl" | "ltr";
export type SupportedLocale = "fa" | "en";

export { toPersianDigits, toLatinDigits };

export function isPersianLocale(languageTag: string | undefined): boolean {
  return (languageTag ?? "").toLowerCase().startsWith("fa");
}

export function resolveLocale(languageTag: string | undefined): SupportedLocale {
  return isPersianLocale(languageTag) ? "fa" : "en";
}

export function getTextDirection(languageTag: string | undefined): TextDirection {
  return isPersianLocale(languageTag) ? "rtl" : "ltr";
}

/** Localize digits in an already-formatted string. */
export function localizeDigits(value: string, locale: SupportedLocale): string {
  return locale === "fa" ? toPersianDigits(value) : toLatinDigits(value);
}

const BYTE_UNITS: Record<SupportedLocale, string[]> = {
  fa: ["بایت", "کیلوبایت", "مگابایت", "گیگابایت", "ترابایت"],
  en: ["B", "KB", "MB", "GB", "TB"],
};

/** Format a duration in milliseconds as HH:MM:SS. */
export function formatDuration(ms: number, locale: SupportedLocale = "fa"): string {
  const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return localizeDigits(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`, locale);
}

/** Format a byte count using binary units. */
export function formatBytes(bytes: number, locale: SupportedLocale = "fa"): string {
  const units = BYTE_UNITS[locale];
  const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (safeBytes === 0) return localizeDigits(`0 ${units[0]}`, locale);

  const exponent = Math.min(
    Math.floor(Math.log(safeBytes) / Math.log(1024)),
    units.length - 1
  );
  const value = safeBytes / Math.pow(1024, exponent);
  const rounded = Math.round(value * 10) / 10;
  return localizeDigits(`${rounded} ${units[exponent]}`, locale);
}

/** Convert metres per second to km/h. */
export function formatSpeed(metresPerSecond: number, locale: SupportedLocale = "fa"): string {
  const safe = Number.isFinite(metresPerSecond) && metresPerSecond > 0 ? metresPerSecond : 0;
  const kmh = Math.round(safe * 3.6);
  const unit = locale === "fa" ? "کیلومتر/ساعت" : "km/h";
  return localizeDigits(`${kmh} ${unit}`, locale);
}
