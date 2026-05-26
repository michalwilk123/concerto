import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { defaultLocale, normalizeSupportedLocaleCode } from "@/i18n/config";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localeAliasMatch = pathname.match(/^\/([a-z]{2,3})(\/.*)?$/);

  if (localeAliasMatch) {
    const requestedLocale = localeAliasMatch[1];
    const normalizedLocale = normalizeSupportedLocaleCode(requestedLocale);

    if (requestedLocale !== normalizedLocale) {
      const normalizedPath = `${localeAliasMatch[2] || "/"}`.replace(/^\/\//, "/");
      return NextResponse.redirect(new URL(`/${normalizedLocale}${normalizedPath}`, request.url));
    }
  }

  // Let next-intl handle locale detection/redirect first
  const response = intlMiddleware(request);

  // Extract locale-stripped path for auth checks
  const localeMatch = pathname.match(/^\/([a-z]{2,3})(\/.*)?$/);
  const strippedPath = localeMatch ? (localeMatch[2] || "/") : pathname;

  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  // Redirect authenticated users away from auth pages
  if (sessionCookie && (strippedPath === "/login" || strippedPath === "/register")) {
    const locale = normalizeSupportedLocaleCode(localeMatch?.[1] ?? defaultLocale);
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // Redirect unauthenticated users from protected pages to login
  const isProtectedPath =
    strippedPath === "/dashboard" ||
    strippedPath.startsWith("/dashboard/") ||
    strippedPath === "/waiting-approval";
  if (!sessionCookie && isProtectedPath) {
    const locale = normalizeSupportedLocaleCode(localeMatch?.[1] ?? defaultLocale);
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
