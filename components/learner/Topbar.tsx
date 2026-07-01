'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Bell, Moon, Search, Sun } from 'lucide-react'
import { getInitials } from '@/lib/auth'

interface TopbarProps {
  user?: { name: string }
}

export default function Topbar({ user }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  return (
    <header className="border-b border-border bg-card sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search courses, lessons..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0"
            title={user?.name}
            aria-label="Account"
          >
            {getInitials(user?.name || 'Student')}
          </button>
        </div>
      </div>
    </header>
  )
}
