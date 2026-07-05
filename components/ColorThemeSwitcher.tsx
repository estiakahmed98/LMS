'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import {
  COLOR_THEME_META,
  DEFAULT_COLOR_THEME,
  getStoredColorTheme,
  setStoredColorTheme,
  subscribeColorThemeChanges,
  SUPPORTED_COLOR_THEMES,
  type ColorTheme,
} from '@/lib/color-theme'

interface ColorThemeSwitcherProps {
  label?: string
}

export default function ColorThemeSwitcher({ label }: ColorThemeSwitcherProps) {
  const [theme, setTheme] = useState<ColorTheme>(DEFAULT_COLOR_THEME)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    setTheme(getStoredColorTheme())

    return subscribeColorThemeChanges((nextTheme) => {
      setTheme(nextTheme)
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(nextTheme: ColorTheme) {
    setOpen(false)
    setStoredColorTheme(nextTheme)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        aria-label={label ?? 'Select color theme'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Palette className="w-4 h-4" />
        <span
          className="w-3.5 h-3.5 rounded-full border border-border/60"
          style={{
            background: mounted
              ? `linear-gradient(135deg, ${COLOR_THEME_META[theme].primary} 50%, ${COLOR_THEME_META[theme].secondary} 50%)`
              : undefined,
          }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg z-40"
        >
          {SUPPORTED_COLOR_THEMES.map((item) => {
            const meta = COLOR_THEME_META[item]
            const selected = mounted && item === theme

            return (
              <button
                key={item}
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => handleSelect(item)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-card-foreground hover:bg-muted transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="flex -space-x-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-border/60"
                      style={{ background: meta.primary }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-border/60"
                      style={{ background: meta.secondary }}
                    />
                  </span>
                  {meta.label}
                </span>
                {selected && <Check className="w-4 h-4 text-primary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
