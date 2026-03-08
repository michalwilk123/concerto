import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { SUPPORTED_LOCALE_CODES, defaultLocale, normalizeSupportedLocaleCode } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const normalizedLocale = normalizeSupportedLocaleCode(locale);

  if (!SUPPORTED_LOCALE_CODES.has(normalizedLocale)) {
    notFound();
  }

  setRequestLocale(normalizedLocale || defaultLocale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
