import { auth } from "@/lib/auth";

/**
 * Resolve session from request headers (works with Bearer tokens).
 * Unlike getSessionOrNull(), this doesn't depend on Next.js headers() context,
 * making mobile routes testable outside Next.js request scope.
 */
export async function getSessionFromRequest(request: Request) {
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch (e) {
    console.error("getSessionFromRequest error:", e);
    return null;
  }
}
