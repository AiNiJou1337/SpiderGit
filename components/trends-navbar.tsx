"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export function TrendsNavbar() {
  const pathname = usePathname()
  
  const navItems = [
    {
      name: '每日趋势',
      href: '/daily',
      gradient: 'from-blue-500/20 to-indigo-500/20',
    },
    {
      name: '每周趋势',
      href: '/weekly',
      gradient: 'from-purple-500/20 to-violet-500/20',
    },
    {
      name: '每月趋势',
      href: '/monthly',
      gradient: 'from-green-500/20 to-emerald-500/20',
    },
  ]
  
  return (
    <Card className="glass-card bg-gradient-to-br from-gray-500/5 to-slate-500/5 p-2">
      <div className="flex overflow-auto">
        <nav className="flex space-x-3 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-10 items-center justify-center rounded-md px-5 py-2 text-sm font-medium transition-all",
                  isActive
                    ? `bg-gradient-to-r ${item.gradient} text-foreground shadow-sm glass-effect`
                    : "text-muted-foreground hover:bg-gradient-to-r hover:from-gray-500/10 hover:to-gray-500/10 hover:text-primary"
                )}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </Card>
  )
} 