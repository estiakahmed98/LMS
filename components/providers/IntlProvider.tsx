"use client";

import { useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import bn from "@/messages/bn.json";
import ar from "@/messages/ar.json";
import ja from "@/messages/ja.json";
import ne from "@/messages/ne.json";
import {
  DEFAULT_LOCALE,
  getStoredLocale,
  isRtlLocale,
  subscribeLocaleChanges,
  type Locale,
} from "@/lib/locale";

const MESSAGES: Record<Locale, Record<string, unknown>> = { en, bn, ar, ja, ne };

export default function IntlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const initialLocale = getStoredLocale();
    setLocale(initialLocale);
    document.documentElement.dir = isRtlLocale(initialLocale) ? "rtl" : "ltr";

    return subscribeLocaleChanges((nextLocale) => {
      setLocale(nextLocale);
      document.documentElement.dir = isRtlLocale(nextLocale) ? "rtl" : "ltr";
    });
  }, []);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      timeZone="Asia/Dhaka"
    >
      {children}
    </NextIntlClientProvider>
  );
}
