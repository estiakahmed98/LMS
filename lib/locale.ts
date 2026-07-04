export type Locale = 'en' | 'bn' | 'ar' | 'ja'

export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_STORAGE_KEY = 'pstc_locale'
export const LOCALE_COOKIE_KEY = 'pstc_locale'
export const LOCALE_CHANGE_EVENT = 'pstc-locale-change'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  bn: 'বাংলা',
  ar: 'العربية',
  ja: '日本語',
}

export const RTL_LOCALES: readonly Locale[] = ['ar']

export function isRtlLocale(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale)
}

const LOCALE_VALUES: readonly Locale[] = ['en', 'bn', 'ar', 'ja']

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALE_VALUES as readonly string[]).includes(value)
}

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE
  }

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return isLocale(stored) ? stored : DEFAULT_LOCALE
}

export function setStoredLocale(locale: Locale) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  window.document.cookie = `${LOCALE_COOKIE_KEY}=${locale};path=/;max-age=31536000;SameSite=Lax`
  window.document.documentElement.lang = locale
  window.document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr'
  window.dispatchEvent(new CustomEvent<Locale>(LOCALE_CHANGE_EVENT, { detail: locale }))
}

export function subscribeLocaleChanges(handler: (locale: Locale) => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === LOCALE_STORAGE_KEY && isLocale(event.newValue)) {
      handler(event.newValue)
    }
  }

  function handleCustomEvent(event: Event) {
    const customEvent = event as CustomEvent<Locale>
    if (isLocale(customEvent.detail)) {
      handler(customEvent.detail)
    }
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(LOCALE_CHANGE_EVENT, handleCustomEvent as EventListener)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(LOCALE_CHANGE_EVENT, handleCustomEvent as EventListener)
  }
}
