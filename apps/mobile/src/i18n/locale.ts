// Platform locale detection for the Expo app.
//
// expo-localization is a native module, so it must not live in @nexgen/core —
// that package is also bundled by the Next.js dashboard. Core exposes pure
// helpers that take a language tag; this file supplies the tag.

import { I18nManager } from "react-native";
import * as Localization from "expo-localization";
import {
  formatBytes as formatBytesCore,
  formatDuration as formatDurationCore,
  formatSpeed as formatSpeedCore,
  getTextDirection,
  resolveLocale,
  type SupportedLocale,
  type TextDirection,
} from "@nexgen/core";

/** BCP-47 tag of the device's preferred locale, e.g. "fa-IR". */
export function getDeviceLanguageTag(): string {
  return Localization.getLocales()[0]?.languageTag ?? "en-US";
}

export function getDeviceLocale(): SupportedLocale {
  return resolveLocale(getDeviceLanguageTag());
}

export function isPersianDevice(): boolean {
  return getDeviceLocale() === "fa";
}

export function getDeviceTextDirection(): TextDirection {
  return getTextDirection(getDeviceLanguageTag());
}

/** Align React Native's layout direction with the device locale. */
export function applyLayoutDirection(): void {
  const shouldBeRtl = getDeviceTextDirection() === "rtl";
  if (I18nManager.isRTL !== shouldBeRtl) {
    I18nManager.allowRTL(shouldBeRtl);
    I18nManager.forceRTL(shouldBeRtl);
  }
}

// Locale-bound convenience wrappers so screens do not pass the locale around.
export const formatDuration = (ms: number) => formatDurationCore(ms, getDeviceLocale());
export const formatBytes = (bytes: number) => formatBytesCore(bytes, getDeviceLocale());
export const formatSpeed = (mps: number) => formatSpeedCore(mps, getDeviceLocale());
