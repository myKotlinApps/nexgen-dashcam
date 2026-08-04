import { useCallback, useEffect, useRef, useState } from "react";
import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import type { PlateEvent } from "@nexgen/core";
import { ALPR_INFERENCE_FPS_WEAK } from "@nexgen/core";

const { NexGenDashCam } = NativeModules;
const isNativeAvailable = Platform.OS !== "web" && NexGenDashCam != null;

/** Cap on retained events so a long trip cannot grow memory without bound. */
const MAX_RETAINED_PLATES = 500;

export type AlprStatus = "idle" | "loading" | "ready" | "error";

export interface AlprState {
  isActive: boolean;
  status: AlprStatus;
  detail: string;
  inferenceFps: number;
  plates: PlateEvent[];
  lastPlate: PlateEvent | null;
}

const initialState: AlprState = {
  isActive: false,
  status: "idle",
  detail: "",
  inferenceFps: ALPR_INFERENCE_FPS_WEAK,
  plates: [],
  lastPlate: null,
};

export function useAlpr() {
  const [state, setState] = useState<AlprState>(initialState);
  const platesRef = useRef<PlateEvent[]>([]);

  useEffect(() => {
    if (!isNativeAvailable) return;
    const emitter = new NativeEventEmitter(NexGenDashCam);

    const plateSub = emitter.addListener("onPlateRecognized", (event: PlateEvent) => {
      // Native emits one event per confirmed track; de-duplicate defensively so
      // a re-delivered event cannot double-count a plate.
      if (platesRef.current.some((p) => p.eventId === event.eventId)) return;

      const next = [...platesRef.current, event];
      platesRef.current =
        next.length > MAX_RETAINED_PLATES ? next.slice(-MAX_RETAINED_PLATES) : next;

      setState((s) => ({ ...s, plates: platesRef.current, lastPlate: event }));
    });

    const statusSub = emitter.addListener(
      "onAlprStatus",
      (next: { status: AlprStatus; detail: string }) => {
        setState((s) => ({ ...s, status: next.status, detail: next.detail }));
      }
    );

    return () => {
      plateSub.remove();
      statusSub.remove();
    };
  }, []);

  const startAlpr = useCallback(async (fps: number = ALPR_INFERENCE_FPS_WEAK) => {
    if (!isNativeAvailable) return;
    platesRef.current = [];
    setState({ ...initialState, isActive: true, status: "loading", inferenceFps: fps });
    try {
      await NexGenDashCam.startAlpr({ fps });
    } catch (error) {
      setState((s) => ({
        ...s,
        isActive: false,
        status: "error",
        detail: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  const stopAlpr = useCallback(async () => {
    if (!isNativeAvailable) return;
    try {
      await NexGenDashCam.stopAlpr();
    } finally {
      setState((s) => ({ ...s, isActive: false, status: "idle" }));
    }
  }, []);

  const clearPlates = useCallback(() => {
    platesRef.current = [];
    setState((s) => ({ ...s, plates: [], lastPlate: null }));
  }, []);

  return { ...state, startAlpr, stopAlpr, clearPlates };
}
