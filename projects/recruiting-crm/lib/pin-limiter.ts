import { RateLimiterMemory } from "rate-limiter-flexible";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// 5 failed PIN attempts per IP per 15 minutes; block for 15 minutes after limit hit
const limiter = new RateLimiterMemory({
  points: 5,
  duration: 900,
  blockDuration: 900,
});

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Returns a 429 NextResponse if the IP has exceeded PIN attempt limits,
 * or null if the request can proceed.
 */
export async function checkPinBlocked(req: NextRequest): Promise<NextResponse | null> {
  const ip = getIp(req);
  const info = await limiter.get(ip);
  if (info !== null && info.remainingPoints <= 0) {
    const retryAfter = Math.ceil(info.msBeforeNext / 1000);
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later." },
      { status: 429, headers: { "Retry-After": retryAfter.toString() } }
    );
  }
  return null;
}

/** Call this when a PIN attempt fails to increment the failure count. */
export async function recordPinFailure(req: NextRequest): Promise<void> {
  await limiter.consume(getIp(req)).catch(() => {});
}

/** Call this when a PIN attempt succeeds to reset the counter for this IP. */
export async function clearPinFailures(req: NextRequest): Promise<void> {
  await limiter.delete(getIp(req)).catch(() => {});
}
