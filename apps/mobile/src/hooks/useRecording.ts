import { useCallback, useEffect, useState } from "react";
import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import type { RecordingState } from "@nexgen/core";
import { useAppStore } from "../store/appStore";

const { NexGenDashCam } = NativeModules;
const isNativeAvailable = Platform.OS !== "web" && NexGenDashCam != null;

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

  // Subscribe to individual fields so the effect below is not re-created on
  // every unrelated settings change.
  const quality = useAppStore((s) => s.quality);
  const audioEnabled = useAppStore((s) => s.audioEnabled);
  const gpsEnabled = useAppStore((s) => s.gpsEnabled);
  const alprEnabled = useAppStore((s) => s.alprEnabled);
  const storageLimitMB = useAppStore((s) => s.storageLimitMB);

  useEffect(() => {
    if (!isNativeAvailable) return;
    const emitter = new NativeEventEmitter(NexGenDashCam);

    const statusSub = emitter.addListener(
      "onStatusChange",
      (next: Partial<RecordingState>) => {
        setState((prev) => ({ ...prev, ...next }));
      }
    );
    const stoppedSub = emitter.addListener("onRecordingStopped", () => {
      setState({ ...initialState });
    });

    return () => {
      statusSub.remove();
      stoppedSub.remove();
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!isNativeAvailable) return;
    setState((s) => ({ ...s, status: "preparing", errorMessage: undefined }));
    try {
      await NexGenDashCam.startRecording({
        resolution: quality,
        fps: 30,
        bitrateMbps: quality === "1080p" ? 6 : 3,
        segmentDurationMin: 3,
        audioEnabled,
        gpsEnabled,
        alprEnabled,
        storageLimitMB,
      });
      setState((s) => ({ ...s, status: "recording" }));
    } catch (error) {
      setState((s) => ({
        ...s,
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [quality, audioEnabled, gpsEnabled, alprEnabled, storageLimitMB]);

  const stopRecording = useCallback(async () => {
    if (!isNativeAvailable) return;
    setState((s) => ({ ...s, status: "finalizing" }));
    try {
      await NexGenDashCam.stopRecording();
    } finally {
      setState({ ...initialState });
    }
  }, []);

  const protectClip = useCallback(async (segmentId: string): Promise<boolean> => {
    if (!isNativeAvailable) return false;
    try {
      return Boolean(await NexGenDashCam.protectClip(segmentId));
    } catch {
      return false;
    }
  }, []);

  return { ...state, startRecording, stopRecording, protectClip };
}
