export type Locale = 'en' | 'bn'

export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_STORAGE_KEY = 'pstc_locale'
export const LOCALE_CHANGE_EVENT = 'pstc-locale-change'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  bn: 'বাংলা',
}

function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'bn'
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
  window.document.documentElement.lang = locale
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
    if (customEvent.detail === 'en' || customEvent.detail === 'bn') {
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
