import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE, LOCALE_COOKIE_KEY, type Locale } from '@/lib/locale'

function isLocale(value: string | undefined): value is Locale {
  return value === 'en' || value === 'bn' || value === 'ar' || value === 'ja' || value === 'ne'
}

export default getRequestConfig(async ({ locale }) => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_KEY)?.value
  const resolvedLocale = isLocale(locale) ? locale : isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  }
})
