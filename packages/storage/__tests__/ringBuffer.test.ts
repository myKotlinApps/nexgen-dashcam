import { describe, it, expect } from "vitest";
import { RingBuffer } from "../src/ringBuffer";

const seg = (id: string, sz: number) => ({
  id, tripId: "t1", path: `/${id}.mp4`, sizeBytes: sz,
  durationMs: 180000, startPts: 0, endPts: 180000,
  codec: "H.264", resolution: "1080p", fps: 30,
  isProtected: false, createdAt: new Date().toISOString(),
});

describe("RingBuffer", () => {
  it("adds segments within limit", () => {
    const b = new RingBuffer(1000);
    b.add(seg("1", 200));
    b.add(seg("2", 200));
    expect(b.count).toBe(2);
  });

  it("evicts oldest when full", () => {
    const b = new RingBuffer(500);
    b.add(seg("1", 200));
    b.add(seg("2", 200));
    const evicted = b.add(seg("3", 200));
    expect(evicted?.id).toBe("1");
    expect(b.count).toBe(2);
  });

  it("protects segments from eviction", () => {
    const b = new RingBuffer(500);
    b.add(seg("1", 200));
    b.protect("1");
    b.add(seg("2", 200));
    const evicted = b.add(seg("3", 200));
    expect(evicted?.id).toBe("2");
    expect(b.protectedCount).toBe(1);
  });

  it("clears only unprotected", () => {
    const b = new RingBuffer(1000);
    b.add(seg("1", 200));
    b.add(seg("2", 200));
    b.protect("2");
    b.clearUnprotected();
    expect(b.count).toBe(1);
    expect(b.protectedCount).toBe(1);
  });
});
