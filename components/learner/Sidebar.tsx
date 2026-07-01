'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Award,
  Settings,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/courses', label: 'My Courses', icon: BookOpen },
  { href: '/assessments', label: 'Assessments', icon: FileText },
  { href: '/certificates', label: 'Certificates', icon: Award },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0 bg-muted/50 border-r border-border">
      <div className="px-6 py-6">
        <span className="text-xl font-bold">
          <span className="text-primary">PSTC</span>
          <span className="ml-1 text-foreground">LMS</span>
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive ? 'bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <span
                className={`flex items-center justify-center w-8 h-8 rounded-md ${
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/10 text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className={`text-sm ${isActive ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-4 text-xs text-muted-foreground">PSTC LMS v1.0</div>
    </aside>
  )
}
