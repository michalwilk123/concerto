"use client";

import { defaultLocale, normalizeSupportedLocaleCode } from "@/i18n/config";
import { signOut } from "@/lib/auth-client";

function getLoggedOutPath() {
  if (typeof window === "undefined") {
    return `/${defaultLocale}/login`;
  }

  const localeMatch = window.location.pathname.match(/^\/([a-z]{2,3})(?:\/|$)/);
  const locale = normalizeSupportedLocaleCode(localeMatch?.[1] ?? defaultLocale);

  return `/${locale}/login`;
}

export async function logoutAndRedirect() {
  const result = await signOut();

  if (result?.error) {
    throw new Error(result.error.message || "Failed to sign out");
  }

  window.location.replace(getLoggedOutPath());
}
