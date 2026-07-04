'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, Globe, LogOut, Moon, Sun, User } from 'lucide-react'
import { clearMockSession, getCurrentUser, getInitials } from '@/lib/auth'
import {
  DEFAULT_LOCALE,
  getStoredLocale,
  LOCALE_LABELS,
  setStoredLocale,
  SUPPORTED_LOCALES,
  subscribeLocaleChanges,
  type Locale,
} from '@/lib/locale'

interface TopNavProps {
  title?: string
  showLogo?: boolean
}

export default function TopNav({ title, showLogo = true }: TopNavProps) {
  const t = useTranslations('common')
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)
  const [menuOpen, setMenuOpen] = useState(false)
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const languageMenuRef = useRef<HTMLDivElement>(null)

  const currentUser = getCurrentUser('/admin')

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

      if (languageMenuRef.current && !languageMenuRef.current.contains(target)) {
        setLanguageMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleLocaleChange = (nextLocale: Locale) => {
    setLanguageMenuOpen(false)
    setStoredLocale(nextLocale)
    router.refresh()
  }

  const handleLogout = () => {
    setMenuOpen(false)
    clearMockSession()
    router.push('/login')
  }

  return (
    <div className="border-b border-border bg-card text-card-foreground">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left section - Logo and title */}
        <div className="flex items-center gap-3">
          {showLogo && (
            <div className="font-bold text-lg">
              <span className="text-primary">PSTC</span> LMS
            </div>
          )}
          {title && <h1 className="text-xl font-semibold">{title}</h1>}
        </div>

        {/* Right section - Controls */}
        <div className="flex items-center gap-4">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Language toggle */}
          <div className="relative" ref={languageMenuRef}>
            <button
              onClick={() => setLanguageMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
              aria-label={t('language')}
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
                className="absolute right-0 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg z-40"
              >
                {SUPPORTED_LOCALES.map((item) => {
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

          {/* Profile / Logout */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0"
              title={currentUser?.name}
              aria-label="Account"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {getInitials(currentUser?.name || 'Admin')}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg py-1 z-40"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-semibold text-card-foreground truncate">
                    {currentUser?.name ?? 'Admin'}
                  </p>
                </div>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    router.push('/admin/settings')
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-card-foreground hover:bg-muted transition-colors"
                >
                  <User className="w-4 h-4" />
                  {t('profile')}
                </button>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
