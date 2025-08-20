"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils/helpers'
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
      <nav className="flex space-x-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "hover:bg-gradient-to-r hover:text-white hover:shadow-lg hover:scale-105",
              pathname === item.href
                ? `bg-gradient-to-r ${item.gradient} text-gray-900 dark:text-white shadow-md`
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
              `hover:${item.gradient}`
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </Card>
  )
}
