import { useCallback, useEffect, useRef, useState } from "react";
import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import type { PlateEvent } from "@nexgen/core";

const { NexGenDashCam } = NativeModules;

export interface AlprState {
  isActive: boolean;
  status: "loading" | "ready" | "idle" | "error";
  detail: string;
  inferenceFps: number;
  plates: PlateEvent[];
  lastPlate: PlateEvent | null;
}

export function useAlpr() {
  const [state, setState] = useState<AlprState>({
    isActive: false,
    status: "idle",
    detail: "",
    inferenceFps: 4,
    plates: [],
    lastPlate: null,
  });

  const platesRef = useRef<PlateEvent[]>([]);

  useEffect(() => {
    const emitter = new NativeEventEmitter(NexGenDashCam);

    const plateSub = emitter.addListener("onPlateRecognized", (event: PlateEvent) => {
      platesRef.current = [...platesRef.current, event];
      setState((s) => ({
        ...s,
        plates: platesRef.current,
        lastPlate: event,
      }));
    });

    const statusSub = emitter.addListener("onAlprStatus", (s: { status: string; detail: string }) => {
      setState((prev) => ({
        ...prev,
        status: s.status as AlprState["status"],
        detail: s.detail,
      }));
    });

    return () => {
      plateSub.remove();
      statusSub.remove();
    };
  }, []);

  const startAlpr = useCallback(
    async (fps = 4) => {
      if (Platform.OS === "web") return;
      try {
        await NexGenDashCam.startAlpr({ fps });
        platesRef.current = [];
        setState((s) => ({
          ...s,
          isActive: true,
          status: "loading",
          inferenceFps: fps,
          plates: [],
          lastPlate: null,
        }));
      } catch (e) {
        setState((s) => ({ ...s, status: "error", detail: String(e) }));
      }
    },
    []
  );

  const stopAlpr = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      await NexGenDashCam.stopAlpr();
      setState((s) => ({ ...s, isActive: false, status: "idle" }));
    } catch {}
  }, []);

  const clearPlates = useCallback(() => {
    platesRef.current = [];
    setState((s) => ({ ...s, plates: [], lastPlate: null }));
  }, []);

  return { ...state, startAlpr, stopAlpr, clearPlates };
}
