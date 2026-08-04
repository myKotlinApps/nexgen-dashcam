import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type ThemeMode = "light" | "dark" | "system";
export type RecordingQuality = "720p" | "1080p";

interface AppState {
  theme: ThemeMode;
  quality: RecordingQuality;
  audioEnabled: boolean;
  gpsEnabled: boolean;
  alprEnabled: boolean;
  plateCityLookup: boolean;
  storageLimitMB: number;

  setTheme: (theme: ThemeMode) => void;
  setQuality: (quality: RecordingQuality) => void;
  toggleAudio: () => void;
  toggleGps: () => void;
  toggleAlpr: () => void;
  togglePlateCityLookup: () => void;
  setStorageLimit: (mb: number) => void;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    theme: "dark",
    quality: "720p",
    audioEnabled: false,
    gpsEnabled: true,
    alprEnabled: false,
    plateCityLookup: false,
    storageLimitMB: 8192,

    setTheme: (theme) => set({ theme }),
    setQuality: (quality) => set({ quality }),
    toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
    toggleGps: () => set((s) => ({ gpsEnabled: !s.gpsEnabled })),
    toggleAlpr: () => set((s) => ({ alprEnabled: !s.alprEnabled })),
    togglePlateCityLookup: () =>
      set((s) => ({ plateCityLookup: !s.plateCityLookup })),
    setStorageLimit: (mb) => set({ storageLimitMB: mb }),
  }))
);

export { type AppState };
