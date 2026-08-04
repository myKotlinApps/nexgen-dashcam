import type { Segment } from "@nexgen/core";

/**
 * Fixed-size on-disk segment ring. When the quota is exceeded the oldest
 * unprotected segment is evicted; protected segments are never dropped.
 */
export class RingBuffer {
  private segments: Segment[] = [];
  private protectedIds = new Set<string>();

  /**
   * Monotonic insertion counter. Segments finalized inside the same clock tick
   * share a createdAt value, so ordering by timestamp alone is unstable and
   * eviction could drop the wrong file. This breaks those ties by arrival.
   */
  private sequence = 0;
  private order = new Map<string, number>();

  constructor(private maxSizeBytes: number) {}

  get currentSizeBytes(): number {
    return this.segments.reduce((sum, s) => sum + s.sizeBytes, 0);
  }

  get count(): number {
    return this.segments.length;
  }

  get protectedCount(): number {
    return this.protectedIds.size;
  }

  /** Adds a segment, evicting the oldest unprotected ones to stay in quota. */
  add(segment: Segment): Segment | null {
    let lastEvicted: Segment | null = null;

    while (
      this.segments.length > 0 &&
      this.currentSizeBytes + segment.sizeBytes > this.maxSizeBytes
    ) {
      const oldest = this.findOldestUnprotected();
      if (!oldest) break; // everything left is protected
      this.remove(oldest.id);
      lastEvicted = oldest;
    }

    this.order.set(segment.id, this.sequence++);
    this.segments.push(segment);
    return lastEvicted;
  }

  protect(id: string): boolean {
    if (!this.segments.some((s) => s.id === id)) return false;
    this.protectedIds.add(id);
    return true;
  }

  unprotect(id: string): boolean {
    return this.protectedIds.delete(id);
  }

  isProtected(id: string): boolean {
    return this.protectedIds.has(id);
  }

  getProtectedSegments(): Segment[] {
    return this.segments.filter((s) => this.protectedIds.has(s.id));
  }

  getUnprotectedSegments(): Segment[] {
    return this.segments.filter((s) => !this.protectedIds.has(s.id));
  }

  getAll(): ReadonlyArray<Segment> {
    return this.segments;
  }

  /** Drops every unprotected segment and returns what was removed. */
  clearUnprotected(): Segment[] {
    const removed = this.getUnprotectedSegments();
    for (const segment of removed) this.order.delete(segment.id);
    this.segments = this.getProtectedSegments();
    return removed;
  }

  reset(): void {
    this.segments = [];
    this.protectedIds.clear();
    this.order.clear();
    this.sequence = 0;
  }

  private remove(id: string): void {
    this.segments = this.segments.filter((s) => s.id !== id);
    this.order.delete(id);
  }

  private findOldestUnprotected(): Segment | undefined {
    let oldest: Segment | undefined;
    let oldestKey = Number.POSITIVE_INFINITY;
    let oldestSeq = Number.POSITIVE_INFINITY;

    for (const segment of this.segments) {
      if (this.protectedIds.has(segment.id)) continue;

      const createdAt = Date.parse(segment.createdAt);
      const key = Number.isNaN(createdAt) ? Number.POSITIVE_INFINITY : createdAt;
      const seq = this.order.get(segment.id) ?? Number.POSITIVE_INFINITY;

      if (key < oldestKey || (key === oldestKey && seq < oldestSeq)) {
        oldest = segment;
        oldestKey = key;
        oldestSeq = seq;
      }
    }

    return oldest;
  }
}
