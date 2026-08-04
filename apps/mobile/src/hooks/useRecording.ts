import { useCallback, useEffect, useRef, useState } from "react";
import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import type { RecordingState, RecordingStatus } from "@nexgen/core";
import { useAppStore } from "../store";

const { NexGenDashCam } = NativeModules;

const initialState: RecordingState = {
  status: "idle",
  currentSegmentIndex: 0,
  elapsedMs: 0,
  estimatedStorageRemainingMb: 0,
  droppedFrames: 0,
  thermalState: "normal",
  gpsLocked: false,
};

export function useRecording() {
  const [state, setState] = useState<RecordingState>(initialState);
  const settings = useAppStore();

  useEffect(() => {
    if (Platform.OS === "web") return;
    const emitter = new NativeEventEmitter(NexGenDashCam);

    const statusSub = emitter.addListener("onStatusChange", (s: Partial<RecordingState>) => {
      setState((prev) => ({ ...prev, ...s }));
    });

    const stoppedSub = emitter.addListener("onRecordingStopped", () => {
      setState({ ...initialState });
    });

    return () => { statusSub.remove(); stoppedSub.remove(); };
  }, []);

  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      await NexGenDashCam.startRecording({
        resolution: settings.quality,
        fps: 30,
        bitrateMbps: settings.quality === "1080p" ? 6 : 3,
        segmentDurationMin: 3,
        audioEnabled: settings.audioEnabled,
        gpsEnabled: settings.gpsEnabled,
        alprEnabled: settings.alprEnabled,
        storageLimitMB: settings.storageLimitMB,
      });
      setState((s) => ({ ...s, status: "recording" }));
    } catch (e) {
      setState((s) => ({ ...s, status: "error", errorMessage: String(e) }));
    }
  }, [settings]);

  const stopRecording = useCallback(async () => {
    if (Platform.OS === "web") return;
    await NexGenDashCam.stopRecording();
    setState(initialState);
  }, []);

  const protectClip = useCallback(async (segmentId: string) => {
    return Platform.OS !== "web" && (await NexGenDashCam.protectClip(segmentId));
  }, []);

  return { ...state, startRecording, stopRecording, protectClip };
}
