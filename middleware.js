import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { rateLimit } from './lib/ratelimit';

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);
const isApiRoute = createRouteMatcher(['/api/(.*)']);

export default clerkMiddleware(async (auth, request) => {
  let ratelimitResult = null;

  // 1. Rate Limiting check for API routes
  if (isApiRoute(request)) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    ratelimitResult = rateLimit(ip);

    if (!ratelimitResult.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit of 6 requests per minute exceeded.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': ratelimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': ratelimitResult.reset.toString(),
          },
        }
      );
    }
  }

  // 2. Clerk Authentication check
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // 3. Successful path
  const response = NextResponse.next();

  // Add rate limit headers if it was an API route
  if (ratelimitResult) {
    response.headers.set('X-RateLimit-Limit', ratelimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', ratelimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', ratelimitResult.reset.toString());
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
