import type { GpsDataPoint } from "@nexgen/core";

export interface GpsRecorder {
  start(): void;
  stop(): void;
  getCurrentPosition(): Promise<GpsDataPoint | null>;
  getHistory(sinceMs: number): Promise<GpsDataPoint[]>;
  onUpdate(callback: (point: GpsDataPoint) => void): () => void;
}

export class InMemoryGpsRecorder implements GpsRecorder {
  private points: GpsDataPoint[] = [];
  private listeners: Array<(point: GpsDataPoint) => void> = [];
  private intervalId?: NodeJS.Timeout;

  start(): void {
    this.points = [];
    this.intervalId = setInterval(() => {
      const point: GpsDataPoint = {
        timestampMs: Date.now(),
        latitude: 35.6892 + Math.random() * 0.01,
        longitude: 51.389 + Math.random() * 0.01,
        speedMs: 15 + Math.random() * 20,
        heading: Math.random() * 360,
        altitude: 1200 + Math.random() * 100,
        accuracy: 3 + Math.random() * 5,
      };
      this.points.push(point);
      this.listeners.forEach((cb) => cb(point));
    }, 1000);
  }

  stop(): void { if (this.intervalId) clearInterval(this.intervalId); }

  async getCurrentPosition(): Promise<GpsDataPoint | null> {
    return this.points[this.points.length - 1] ?? null;
  }

  async getHistory(sinceMs: number): Promise<GpsDataPoint[]> {
    return this.points.filter((p) => p.timestampMs >= sinceMs);
  }

  onUpdate(callback: (point: GpsDataPoint) => void): () => void {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter((l) => l !== callback); };
  }
}
