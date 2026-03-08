import { defineRouting } from "next-intl/routing";
import { ALL_SUPPORTED_LOCALES, defaultLocale } from "./config";

export const routing = defineRouting({
  locales: ALL_SUPPORTED_LOCALES,
  defaultLocale,
});
