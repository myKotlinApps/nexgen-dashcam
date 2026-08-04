import { describe, it, expect } from "vitest";

describe("SpaceManager", () => {
  it("computes percentage correctly", async () => {
    const { SpaceManager } = await import("../src/spaceManager");
    const mgr = new SpaceManager(8000);
    const s = mgr.check(6000, 2000);
    expect(s.percentUsed).toBe(75);
    expect(s.isWarning).toBe(false);
  });

  it("detects warning threshold", async () => {
    const { SpaceManager } = await import("../src/spaceManager");
    const mgr = new SpaceManager(8000);
    const s = mgr.check(7000, 1000);
    expect(s.percentUsed).toBe(87);
    expect(s.isWarning).toBe(true);
  });

  it("detects critical threshold", async () => {
    const { SpaceManager } = await import("../src/spaceManager");
    const mgr = new SpaceManager(8000);
    const s = mgr.check(7700, 300);
    expect(s.isCritical).toBe(true);
  });
});
