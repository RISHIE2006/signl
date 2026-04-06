/**
 * Simple in-memory rate limiter for Next.js API Routes (Node.js Serverless).
 * Note: State is per-instance and not shared across distributed serverless invocations.
 * For production-grade rate limiting, use Upstash Redis.
 */

const rateLimitMap = new Map();

export function rateLimit(ip) {
  const now = Date.now();
  const windowSize = 60 * 1000; // 1 minute
  const limit = 10; // Increased slightly for serverless (per-instance limit)

  let timestamps = rateLimitMap.get(ip) || [];
  timestamps = timestamps.filter((time) => now - time < windowSize);

  if (timestamps.length >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: timestamps[0] + windowSize,
    };
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);

  return {
    success: true,
    limit,
    remaining: limit - timestamps.length,
    reset: timestamps[0] + windowSize,
  };
}

/**
 * Helper to apply rate limiting in an API route handler.
 * Returns a 429 NextResponse if rate limited, otherwise returns null.
 */
export function applyRateLimit(request) {
  const { NextResponse } = require('next/server');
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.ip ||
    '127.0.0.1';

  const result = rateLimit(ip);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded. Please wait a moment.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.reset.toString(),
        },
      }
    );
  }

  return null; // No rate limit hit, proceed
}
