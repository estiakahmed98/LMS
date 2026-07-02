'use client'

import { getCurrentUser } from '@/lib/auth'
import { useTheme } from 'next-themes'
import { Settings as SettingsIcon } from 'lucide-react'

export default function SettingsPage() {
  const currentUser = getCurrentUser()
  const { theme, setTheme } = useTheme()

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
          <SettingsIcon className="w-5 h-5" />
        </span>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Full Name</p>
          <p className="text-card-foreground font-medium">{currentUser?.name}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
          <p className="text-card-foreground font-medium">{currentUser?.email}</p>
        </div>
        {currentUser?.phone && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Phone</p>
            <p className="text-card-foreground font-medium">{currentUser.phone}</p>
          </div>
        )}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <p className="text-sm font-medium text-card-foreground">Dark Mode</p>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
          >
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
      </div>
    </div>
  )
}
