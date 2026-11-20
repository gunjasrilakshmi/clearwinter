interface Bucket {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    const recent = bucket.timestamps.filter((ts) => ts > cutoff);

    if (recent.length >= this.maxRequests) {
      this.buckets.set(key, { timestamps: recent });
      const oldest = recent[0] ?? now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    recent.push(now);
    this.buckets.set(key, { timestamps: recent });

    // Periodic pruning when map grows large
    if (this.buckets.size > 1000) {
      for (const [k, b] of this.buckets.entries()) {
        if (b.timestamps.every((ts) => ts <= cutoff)) {
          this.buckets.delete(k);
        }
      }
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }
}
