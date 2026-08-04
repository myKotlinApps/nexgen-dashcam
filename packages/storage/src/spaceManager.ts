export interface SpaceStatus {
  totalBytes: number;
  usedByAppBytes: number;
  freeBytes: number;
  quotaBytes: number;
  /** Exact percentage of the quota consumed, 0-100 and unrounded. */
  percentUsed: number;
  /** Whole-number percentage, for display only. */
  percentUsedRounded: number;
  isWarning: boolean;
  isCritical: boolean;
}

export const SPACE_WARNING_THRESHOLD = 0.85;
export const SPACE_CRITICAL_THRESHOLD = 0.95;
export const SPACE_SAFE_BUFFER_BYTES = 256 * 1024 * 1024;

export class SpaceManager {
  constructor(private quotaBytes: number) {
    if (!Number.isFinite(quotaBytes) || quotaBytes <= 0) {
      throw new RangeError(`quotaBytes must be a positive number, got ${quotaBytes}`);
    }
  }

  check(usedBytes: number, freeBytes: number): SpaceStatus {
    const used = Math.max(0, usedBytes);
    const free = Math.max(0, freeBytes);
    const ratio = used / this.quotaBytes;

    return {
      totalBytes: this.quotaBytes + free,
      usedByAppBytes: used,
      freeBytes: free,
      quotaBytes: this.quotaBytes,
      percentUsed: ratio * 100,
      percentUsedRounded: Math.round(ratio * 100),
      isWarning: ratio >= SPACE_WARNING_THRESHOLD,
      isCritical: ratio >= SPACE_CRITICAL_THRESHOLD,
    };
  }

  /**
   * Largest quota that still leaves a safety buffer on the volume.
   * Returns 0 when the device is already below the buffer.
   */
  ensureSafeBuffer(freeSystemBytes: number): number {
    const usable = freeSystemBytes - SPACE_SAFE_BUFFER_BYTES;
    return Math.max(0, Math.min(this.quotaBytes, usable));
  }
}
