import * as Localization from "expo-localization";

/**
 * Detect if the device locale is Persian/Farsi.
 */
export function isPersianLocale(): boolean {
  const locales = Localization.getLocales();
  return locales.some((l) => l.languageCode === "fa" || l.languageTag?.startsWith("fa"));
}

/**
 * Get text direction based on locale.
 */
export function getTextDirection(): "rtl" | "ltr" {
  return isPersianLocale() ? "rtl" : "ltr";
}

/**
 * Format a number with Persian digits.
 */
export function toPersianDigits(n: number): string {
  const digits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return n.toString().replace(/\d/g, (d) => digits[parseInt(d)] ?? d);
}

/**
 * Format duration in ms to HH:MM:SS string (Persian digits).
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "۰ بایت";
  const units = ["بایت", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${toPersianDigits(Math.round(value * 10) / 10)} ${units[i]}`;
}

/**
 * Format speed in m/s to km/h (Persian digits).
 */
export function formatSpeed(ms: number): string {
  const kmh = Math.round(ms * 3.6);
  return `${toPersianDigits(kmh)} کیلومتر/ساعت`;
}
