"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, BarChart2, Search, Info, Settings, TrendingUp } from "lucide-react"

const navItems = [
  { name: "首页", href: "/", icon: Home },
  {
    name: "趋势分析", 
    href: "/daily", 
    icon: BarChart2
  },
  { name: "关键词搜索", href: "/keywords", icon: Search },
  { name: "关于项目", href: "/about", icon: Info },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <aside className="h-full w-48 min-w-[160px] bg-muted/40 border-r flex flex-col py-8 px-2">
      <div className="flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href)) ||
            (item.subItems && item.subItems.some(sub => pathname === sub.href))
          
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-md text-base font-medium transition-colors hover:bg-primary/10 hover:text-primary",
                  active ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
              
              {/* 子菜单项 */}
              {item.subItems && (
                <div className="ml-9 mt-1 flex flex-col gap-1">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon
                    const subActive = pathname === subItem.href
                    
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors hover:bg-primary/10 hover:text-primary",
                          subActive ? "text-primary font-medium" : "text-muted-foreground"
                        )}
                      >
                        <SubIcon className="h-3.5 w-3.5" />
                        {subItem.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}