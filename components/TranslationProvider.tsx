"use client";

import { createContext, useContext } from "react";

export interface TranslationLanguage {
  code: string;
  label: string;
  isDefault: boolean;
  rtl: boolean;
}

export interface TranslationContextValue {
  locale: string;
  messages: Record<string, string>;
  languages: TranslationLanguage[];
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

export function TranslationProvider({
  locale,
  messages,
  languages,
  children,
}: TranslationContextValue & { children: React.ReactNode }) {
  return (
    <TranslationContext.Provider value={{ locale, messages, languages }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslationContext(): TranslationContextValue {
  const ctx = useContext(TranslationContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return ctx;
}
