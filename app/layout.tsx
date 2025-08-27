import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { ThemeProvider } from '@/components/layout/theme-provider'
import Image from 'next/image'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GitHub 趋势爬虫',
  description: '探索GitHub热门项目，挖掘编程语言与开源趋势',
  icons: {
    icon: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <header className="border-b glass-effect sticky top-0 z-[100] bg-white/80 backdrop-blur-sm">
              <div className="container mx-auto py-4 flex justify-between items-center">
                <Link
                  href="/"
                  className="font-bold text-lg flex items-center hover:opacity-80 transition-opacity relative z-[101]"
                  style={{ textDecoration: 'none' }}
                >
                  <Image
                    src="/logo.png"
                    alt="GitHub 趋势爬虫 Logo"
                    width={36}
                    height={36}
                    className="mr-2"
                  />
                  GitHub 趋势爬虫
                </Link>
                <nav className="flex space-x-6 relative z-[101]">
                  <Link
                    href="/"
                    className="hover:text-blue-600 transition-colors cursor-pointer relative z-[102] px-2 py-1"
                    style={{ textDecoration: 'none', pointerEvents: 'auto' }}
                  >
                    项目介绍
                  </Link>
                  <Link
                    href="/dashboard"
                    className="hover:text-blue-600 transition-colors cursor-pointer relative z-[102] px-2 py-1"
                    style={{ textDecoration: 'none', pointerEvents: 'auto' }}
                  >
                    数据仪表盘
                  </Link>
                  <Link
                    href="/trends"
                    className="hover:text-blue-600 transition-colors cursor-pointer relative z-[102] px-2 py-1"
                    style={{ textDecoration: 'none', pointerEvents: 'auto' }}
                  >
                    趋势分析
                  </Link>
                  <Link
                    href="/keywords"
                    className="hover:text-blue-600 transition-colors cursor-pointer relative z-[102] px-2 py-1"
                    style={{ textDecoration: 'none', pointerEvents: 'auto' }}
                  >
                    关键词分析
                  </Link>
                  <Link
                    href="/about"
                    className="hover:text-blue-600 transition-colors cursor-pointer relative z-[102] px-2 py-1"
                    style={{ textDecoration: 'none', pointerEvents: 'auto' }}
                  >
                    关于项目
                  </Link>
                  <Link
                    href="/testing"
                    className="hover:text-green-600 transition-colors cursor-pointer text-sm relative z-[102] px-2 py-1"
                    style={{ textDecoration: 'none', pointerEvents: 'auto' }}
                  >
                    项目测试
                  </Link>
                </nav>
              </div>
            </header>
            <main className="flex-1">
              {children}
            </main>
            <footer className="py-6 border-t glass-effect">
              <div className="container mx-auto text-center text-sm text-muted-foreground">
                <p>用❤️打造 | 基于Next.js, Python和PostgreSQL</p>
                <p>© 2025 GitHub趋势爬虫团队</p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}