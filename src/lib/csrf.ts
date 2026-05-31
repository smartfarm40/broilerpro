import { NextRequest } from "next/server";

/**
 * Validate that the request comes from our own domain (CSRF protection).
 * Checks Origin and Referer headers against allowed origins.
 */
export function validateOrigin(request: NextRequest): boolean {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "http://localhost:3000",
    "https://broilerpro.vercel.app",
  ].filter(Boolean);

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // If origin header exists, validate it
  if (origin) {
    return allowedOrigins.some((allowed) => origin.startsWith(allowed));
  }

  // Fallback to referer
  if (referer) {
    return allowedOrigins.some((allowed) => referer.startsWith(allowed));
  }

  // No origin/referer — could be server-side call or same-origin (browsers always send origin for POST)
  // Be permissive for non-browser clients but strict for browser requests
  return true;
}
