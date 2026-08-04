import { describe, expect, it } from "vitest";
import {
  SPACE_SAFE_BUFFER_BYTES,
  SpaceManager,
} from "../src/spaceManager";

describe("SpaceManager", () => {
  it("computes an exact percentage", () => {
    const status = new SpaceManager(8000).check(6000, 2000);
    expect(status.percentUsed).toBe(75);
    expect(status.percentUsedRounded).toBe(75);
    expect(status.isWarning).toBe(false);
    expect(status.totalBytes).toBe(10_000);
  });

  it("does not round the percentage into the wrong bucket", () => {
    // 7000/8000 is 87.5 exactly — rounding it to 88 previously broke callers.
    const status = new SpaceManager(8000).check(7000, 1000);
    expect(status.percentUsed).toBeCloseTo(87.5);
    expect(status.percentUsedRounded).toBe(88);
    expect(status.isWarning).toBe(true);
    expect(status.isCritical).toBe(false);
  });

  it("flags the critical threshold", () => {
    const status = new SpaceManager(8000).check(7700, 300);
    expect(status.isWarning).toBe(true);
    expect(status.isCritical).toBe(true);
  });

  it("treats negative inputs as zero", () => {
    const status = new SpaceManager(8000).check(-100, -50);
    expect(status.usedByAppBytes).toBe(0);
    expect(status.freeBytes).toBe(0);
    expect(status.percentUsed).toBe(0);
  });

  it("reserves a safety buffer on the volume", () => {
    const manager = new SpaceManager(8000);
    expect(manager.ensureSafeBuffer(SPACE_SAFE_BUFFER_BYTES + 5000)).toBe(5000);
  });

  it("never returns a negative quota", () => {
    expect(new SpaceManager(8000).ensureSafeBuffer(1024)).toBe(0);
  });

  it("rejects a non-positive quota", () => {
    expect(() => new SpaceManager(0)).toThrow(RangeError);
  });
});
