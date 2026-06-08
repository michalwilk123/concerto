import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { TranslationProvider } from "@/components/TranslationProvider";
import { resolveLocale } from "@/lib/locale";
import { getActiveLanguages, getMessages } from "@/lib/services/translation-service";

export const metadata = {
  title: "Concerto",
  description: "Collaborative music education platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { code, rtl } = await resolveLocale();
  const [messages, languages] = await Promise.all([getMessages(code), getActiveLanguages()]);

  return (
    <html lang={code} dir={rtl ? "rtl" : "ltr"} suppressHydrationWarning>
      <body>
        <TranslationProvider
          locale={code}
          messages={messages}
          languages={languages.map((l) => ({
            code: l.code,
            label: l.label,
            isDefault: l.isDefault,
            rtl: l.rtl,
          }))}
        >
          <ToastProvider>{children}</ToastProvider>
        </TranslationProvider>
        <div id="portal-root" />
      </body>
    </html>
  );
}
