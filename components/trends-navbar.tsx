"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function TrendsNavbar() {
  const pathname = usePathname()
  
  const navItems = [
    {
      name: '每日趋势',
      href: '/daily',
    },
    {
      name: '每周趋势',
      href: '/weekly',
    },
    {
      name: '每月趋势',
      href: '/monthly',
    },
  ]
  
  return (
    <div className="flex overflow-auto pb-2">
      <nav className="flex space-x-2 border-b w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:text-primary",
                isActive
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
} 