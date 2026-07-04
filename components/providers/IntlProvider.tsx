"use client";

import { useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import bn from "@/messages/bn.json";
import {
  DEFAULT_LOCALE,
  getStoredLocale,
  subscribeLocaleChanges,
  type Locale,
} from "@/lib/locale";

const MESSAGES: Record<Locale, typeof en> = { en, bn };

export default function IntlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(getStoredLocale());
    return subscribeLocaleChanges(setLocale);
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
