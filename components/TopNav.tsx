'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { Moon, Sun, Globe, LogOut, User } from 'lucide-react'
import { getCurrentUser, getInitials } from '@/lib/auth'

interface TopNavProps {
  title?: string
  showLogo?: boolean
}

export default function TopNav({ title, showLogo = true }: TopNavProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [locale, setLocale] = useState('en')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentUser = getCurrentUser()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'bn' : 'en'
    setLocale(newLocale)
  }

  const handleLogout = () => {
    setMenuOpen(false)
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
          <button
            onClick={toggleLocale}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium"
            aria-label="Toggle language"
          >
            <Globe className="w-5 h-5" />
          </button>

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
                  Profile
                </button>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
