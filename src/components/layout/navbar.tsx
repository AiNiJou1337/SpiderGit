"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils/helpers"
import { Home, BarChart2, Search, Info, Settings, TrendingUp, TestTube } from "lucide-react"
import Image from "next/image"
import { LucideIcon } from "lucide-react"

type SubItem = {
  name: string
  href: string
  icon: LucideIcon
}

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
  subItems?: SubItem[]
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Trends",
    href: "/trends",
    icon: TrendingUp,
  },
  {
    name: "Keywords",
    href: "/keywords",
    icon: Search,
  },
  {
    name: "About",
    href: "/about",
    icon: Info,
  },
  {
    name: "项目测试",
    href: "/testing",
    icon: TestTube,
  },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <Image
                  src="/logo.png"
                  alt="GitHub Trending"
                  width={32}
                  height={32}
                  className="rounded"
                />
                <span className="font-bold text-xl text-gray-900 dark:text-white">
                  GitHub Trending
                </span>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.subItems && item.subItems.some(sub => pathname === sub.href))
                
                return (
                  <div key={item.name} className="relative group">
                    <Link
                      href={item.href}
                      className={cn(
                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors",
                        isActive
                          ? "border-blue-500 text-gray-900 dark:text-white"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                      )}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>

                    {/* Dropdown for sub-items */}
                    {item.subItems && (
                      <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="py-1">
                          {item.subItems.map((subItem) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={cn(
                                "flex items-center px-4 py-2 text-sm transition-colors",
                                pathname === subItem.href
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                              )}
                            >
                              <subItem.icon className="w-4 h-4 mr-3" />
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
