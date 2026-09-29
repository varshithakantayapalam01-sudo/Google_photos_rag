/**
 * In-memory IP Rate Limiter
 * Enforces max 10 requests per minute per IP address for the Ask-the-Research endpoint.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const ipMap = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

/**
 * Checks rate limit using sliding window algorithm.
 */
export function checkRateLimit(
  ip: string,
  limit = 10,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const entry = ipMap.get(ip) || { timestamps: [] };

  // Remove timestamps outside the current window
  const validTimestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetMs,
    };
  }

  // Record this request
  validTimestamps.push(now);
  ipMap.set(ip, { timestamps: validTimestamps });

  return {
    allowed: true,
    limit,
    remaining: limit - validTimestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Resets all rate limit buckets (for testing)
 */
export function resetRateLimits(): void {
  ipMap.clear();
}
