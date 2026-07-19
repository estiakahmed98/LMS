'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Bell, Check, ChevronDown, Globe, LogOut, Moon, Sun, User } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { clearMockSession, getInitials, subscribeSessionUserChanges, getCurrentUser } from '@/lib/auth'
import ColorThemeSwitcher from '@/components/ColorThemeSwitcher'
import NotificationBell from '@/components/NotificationBell'
import {
  DEFAULT_LOCALE,
  getStoredLocale,
  LOCALE_LABELS,
  type Locale,
  setStoredLocale,
  subscribeLocaleChanges,
} from '@/lib/locale'

interface TopbarProps {
  user?: { name: string; photoUrl?: string | null }
  settingsPath?: string
  notificationsPath?: string
}

const TOPBAR_COPY = {
  en: {
    searchPlaceholder: 'Search courses, lessons...',
    profile: 'Profile',
    logout: 'Logout',
  },
  bn: {
    searchPlaceholder: 'কোর্স, পাঠ খুঁজুন...',
    profile: 'প্রোফাইল',
    logout: 'লগ আউট',
  },
  ar: {
    searchPlaceholder: 'ابحث عن الدورات والدروس...',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج',
  },
  ja: {
    searchPlaceholder: 'コース、レッスンを検索...',
    profile: 'プロフィール',
    logout: 'ログアウト',
  },
  ne: {
    searchPlaceholder: 'पाठ्यक्रम, पाठहरू खोज्नुहोस्...',
    profile: 'प्रोफाइल',
    logout: 'लग आउट',
  },
} as const

export default function Topbar({ user, settingsPath = '/settings', notificationsPath }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)
  const [mounted, setMounted] = useState(false)
  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [displayPhoto, setDisplayPhoto] = useState<string | null>(user?.photoUrl ?? null)
  const menuRef = useRef<HTMLDivElement>(null)
  const languageMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    setLocale(getStoredLocale())

    return subscribeLocaleChanges((nextLocale) => {
      setLocale(nextLocale)
    })
  }, [])

  useEffect(() => {
    const refreshName = () => {
      const mirrored = getCurrentUser()
      setDisplayName(mirrored?.name ?? user?.name ?? 'Student')
      setDisplayPhoto(mirrored?.photoUrl ?? user?.photoUrl ?? null)
    }
    refreshName()
    return subscribeSessionUserChanges(refreshName)
  }, [user?.name, user?.photoUrl])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false)
      }
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(target)
      ) {
        setLanguageMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    setMenuOpen(false)
    clearMockSession()
    await signOut({ redirect: false })
    router.push('/login')
    router.refresh()
  }

  function handleLocaleChange(nextLocale: Locale) {
    setLanguageMenuOpen(false)
    setStoredLocale(nextLocale)
    router.refresh()
  }

  const copy = TOPBAR_COPY[locale]

  return (
    <header className="border-b border-border bg-card sticky top-0 z-30 print:hidden">
      <div className=" px-4 py-3 sm:px-6 ">
        <div className="flex items-center justify-end gap-2 sm:gap-3 lg:order-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          <ColorThemeSwitcher />

          <div className="relative" ref={languageMenuRef}>
            <button
              onClick={() => setLanguageMenuOpen((prev) => !prev)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted transition-colors"
              aria-label="Select language"
              aria-haspopup="menu"
              aria-expanded={languageMenuOpen}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            {languageMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-card py-1 z-40 shadow-lg"
              >
                {(['en', 'bn', 'ar', 'ja', 'ne'] as Locale[]).map((item) => {
                  const selected = item === locale
                  return (
                    <button
                      key={item}
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => handleLocaleChange(item)}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm text-card-foreground hover:bg-muted transition-colors"
                    >
                      <span>{LOCALE_LABELS[item]}</span>
                      {selected && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {notificationsPath ? (
            <NotificationBell apiPath={notificationsPath} />
          ) : (
            <button
              className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-muted transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground sm:size-10"
              title={displayName}
              aria-label="Account"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {displayPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayPhoto} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                getInitials(displayName || 'Student')
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card py-1 z-40 shadow-lg"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-semibold text-card-foreground truncate">
                    {displayName || 'Student'}
                  </p>
                </div>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    router.push(settingsPath)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-card-foreground hover:bg-muted transition-colors"
                >
                  <User className="w-4 h-4" />
                  {copy.profile}
                </button>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {copy.logout}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* <div className="relative w-full min-w-0 lg:order-1 lg:max-w-xl lg:flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-2xl border border-border bg-muted py-3 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/50 lg:rounded-full lg:py-2"
          />
        </div> */}
      </div>
    </header>
  )
}
