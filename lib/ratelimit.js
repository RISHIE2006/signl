/**
 * Simple in-memory rate limiter for Next.js Middleware.
 * Note: This works per-instance (Edge Function or Serverless invocation).
 * It is not shared across multiple globally distributed instances.
 */

const rateLimitMap = new Map();

export function rateLimit(ip) {
  const now = Date.now();
  const windowSize = 60 * 1000; // 1 minute in milliseconds
  const limit = 6;

  // Get current timestamps for this IP
  let timestamps = rateLimitMap.get(ip) || [];

  // Filter out timestamps older than 1 minute
  timestamps = timestamps.filter((time) => now - time < windowSize);

  if (timestamps.length >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: timestamps[0] + windowSize,
    };
  }

  // Add current timestamp and update map
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);

  return {
    success: true,
    limit,
    remaining: limit - timestamps.length,
    reset: timestamps[0] + windowSize,
  };
}
