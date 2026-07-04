'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Bell, Check, ChevronDown, Globe, LogOut, Moon, Search, Sun, User } from 'lucide-react'
import { clearMockSession, getInitials } from '@/lib/auth'
import {
  DEFAULT_LOCALE,
  getStoredLocale,
  LOCALE_LABELS,
  type Locale,
  setStoredLocale,
  subscribeLocaleChanges,
} from '@/lib/locale'

interface TopbarProps {
  user?: { name: string }
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
} as const

export default function Topbar({ user }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)
  const [mounted, setMounted] = useState(false)
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

  function handleLogout() {
    setMenuOpen(false)
    clearMockSession()
    router.push('/login')
  }

  function handleLocaleChange(nextLocale: Locale) {
    setLanguageMenuOpen(false)
    setStoredLocale(nextLocale)
    router.refresh()
  }

  const copy = TOPBAR_COPY[locale]

  return (
    <header className="border-b border-border bg-card sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder={copy.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          <div className="relative" ref={languageMenuRef}>
            <button
              onClick={() => setLanguageMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
              aria-label="Select language"
              aria-haspopup="menu"
              aria-expanded={languageMenuOpen}
            >
              <Globe className="w-4 h-4" />
              <span>{LOCALE_LABELS[locale]}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            {languageMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-card shadow-lg py-1 z-40"
              >
                {(['en', 'bn'] as Locale[]).map((item) => {
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

          <button
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0"
              title={user?.name}
              aria-label="Account"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {getInitials(user?.name || 'Student')}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg py-1 z-40"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-semibold text-card-foreground truncate">
                    {user?.name ?? 'Student'}
                  </p>
                </div>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    router.push('/settings')
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
      </div>
    </header>
  )
}
