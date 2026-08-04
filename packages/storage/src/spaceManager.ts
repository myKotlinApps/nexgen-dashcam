export interface SpaceStatus {
  totalBytes: number;
  usedByAppBytes: number;
  freeBytes: number;
  quotaBytes: number;
  percentUsed: number;
  isWarning: boolean;
  isCritical: boolean;
}

export class SpaceManager {
  private readonly warningThreshold = 0.85;
  private readonly criticalThreshold = 0.95;

  constructor(private quotaBytes: number) {}

  check(usedBytes: number, freeBytes: number): SpaceStatus {
    const percentUsed = usedBytes / this.quotaBytes;
    const isWarning = percentUsed >= this.warningThreshold;
    const isCritical = percentUsed >= this.criticalThreshold;
    return {
      totalBytes: this.quotaBytes + freeBytes,
      usedByAppBytes: usedBytes,
      freeBytes,
      quotaBytes: this.quotaBytes,
      percentUsed: Math.round(percentUsed * 100),
      isWarning,
      isCritical,
    };
  }

  ensureSafeBuffer(freeSystemBytes: number): number {
    const SAFE_BUFFER = 256 * 1024 * 1024;
    return Math.min(this.quotaBytes, freeSystemBytes - SAFE_BUFFER);
  }
}
