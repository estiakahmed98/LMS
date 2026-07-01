'use client'

import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { Moon, Sun, Globe, LogOut } from 'lucide-react'
import { useState } from 'react'

interface TopNavProps {
  title?: string
  showLogo?: boolean
}

export default function TopNav({ title, showLogo = true }: TopNavProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [locale, setLocale] = useState('en')

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'bn' : 'en'
    setLocale(newLocale)
  }

  const handleLogout = () => {
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
            {theme === 'dark' ? (
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

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </div>
  )
}
