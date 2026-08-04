import { describe, expect, it } from "vitest";
import type { Segment } from "@nexgen/core";
import { RingBuffer } from "../src/ringBuffer";

function seg(id: string, sizeBytes: number, createdAt = "2026-01-01T00:00:00.000Z"): Segment {
  return {
    id,
    tripId: "t1",
    path: `/${id}.mp4`,
    sizeBytes,
    durationMs: 180_000,
    startPts: 0,
    endPts: 180_000,
    codec: "H.264",
    resolution: "1080p",
    fps: 30,
    isProtected: false,
    createdAt,
  };
}

describe("RingBuffer", () => {
  it("adds segments while under quota", () => {
    const buffer = new RingBuffer(1000);
    expect(buffer.add(seg("1", 200))).toBeNull();
    expect(buffer.add(seg("2", 200))).toBeNull();
    expect(buffer.count).toBe(2);
    expect(buffer.currentSizeBytes).toBe(400);
  });

  it("evicts the oldest segment when the quota is exceeded", () => {
    const buffer = new RingBuffer(500);
    buffer.add(seg("1", 200));
    buffer.add(seg("2", 200));
    expect(buffer.add(seg("3", 200))?.id).toBe("1");
    expect(buffer.count).toBe(2);
  });

  it("evicts by insertion order when timestamps are identical", () => {
    // Segments finalized in the same millisecond must still evict oldest-first.
    const buffer = new RingBuffer(500);
    const sameInstant = "2026-01-01T00:00:00.000Z";
    buffer.add(seg("a", 200, sameInstant));
    buffer.add(seg("b", 200, sameInstant));
    expect(buffer.add(seg("c", 200, sameInstant))?.id).toBe("a");
  });

  it("never evicts protected segments", () => {
    const buffer = new RingBuffer(500);
    buffer.add(seg("1", 200));
    buffer.protect("1");
    buffer.add(seg("2", 200));
    expect(buffer.add(seg("3", 200))?.id).toBe("2");
    expect(buffer.protectedCount).toBe(1);
    expect(buffer.isProtected("1")).toBe(true);
  });

  it("stops evicting once only protected segments remain", () => {
    const buffer = new RingBuffer(300);
    buffer.add(seg("1", 200));
    buffer.protect("1");
    // Exceeds quota, but the only candidate is protected — keep both.
    buffer.add(seg("2", 200));
    expect(buffer.count).toBe(2);
    expect(buffer.currentSizeBytes).toBe(400);
  });

  it("refuses to protect an unknown id", () => {
    const buffer = new RingBuffer(500);
    expect(buffer.protect("missing")).toBe(false);
  });

  it("clears only unprotected segments", () => {
    const buffer = new RingBuffer(1000);
    buffer.add(seg("1", 200));
    buffer.add(seg("2", 200));
    buffer.protect("2");
    expect(buffer.clearUnprotected().map((s) => s.id)).toEqual(["1"]);
    expect(buffer.count).toBe(1);
    expect(buffer.protectedCount).toBe(1);
  });

  it("resets all state", () => {
    const buffer = new RingBuffer(1000);
    buffer.add(seg("1", 200));
    buffer.protect("1");
    buffer.reset();
    expect(buffer.count).toBe(0);
    expect(buffer.protectedCount).toBe(0);
  });
});
