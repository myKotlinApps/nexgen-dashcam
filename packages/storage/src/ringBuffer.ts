import type { Segment } from "@nexgen/core";

export class RingBuffer {
  private segments: Segment[] = [];
  private protectedIds = new Set<string>();

  constructor(private maxSizeBytes: number) {}

  get currentSizeBytes(): number {
    return this.segments.reduce((sum, s) => sum + s.sizeBytes, 0);
  }

  get count(): number { return this.segments.length; }
  get protectedCount(): number { return this.protectedIds.size; }

  add(segment: Segment): Segment | null {
    let evicted: Segment | null = null;
    while (
      this.segments.length > 0 &&
      this.currentSizeBytes + segment.sizeBytes > this.maxSizeBytes
    ) {
      const oldest = this.findOldestUnprotected();
      if (!oldest) break;
      this.segments = this.segments.filter((s) => s.id !== oldest.id);
      evicted = oldest;
    }
    this.segments.push(segment);
    return evicted;
  }

  protect(id: string): boolean {
    const segment = this.segments.find((s) => s.id === id);
    if (!segment) return false;
    this.protectedIds.add(id);
    return true;
  }

  unprotect(id: string): boolean { return this.protectedIds.delete(id); }

  getProtectedSegments(): Segment[] {
    return this.segments.filter((s) => this.protectedIds.has(s.id));
  }

  getUnprotectedSegments(): Segment[] {
    return this.segments.filter((s) => !this.protectedIds.has(s.id));
  }

  getAll(): ReadonlyArray<Segment> { return this.segments; }

  clearUnprotected(): Segment[] {
    const removed = this.getUnprotectedSegments();
    this.segments = this.getProtectedSegments();
    return removed;
  }

  private findOldestUnprotected(): Segment | undefined {
    return this.segments
      .filter((s) => !this.protectedIds.has(s.id))
      .sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];
  }

  reset(): void { this.segments = []; this.protectedIds.clear(); }
}
