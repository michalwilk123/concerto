// Locale lives in a cookie (NEXT_LOCALE), not the URL, so navigation no longer
// needs to inject/strip a locale segment. These are thin re-exports of the
// stock Next primitives, kept here so existing imports stay unchanged.
export { useRouter, usePathname, redirect } from "next/navigation";
export { default as Link } from "next/link";
