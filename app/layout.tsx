import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GitHub 趋势爬虫',
  description: '探索GitHub热门项目，挖掘编程语言与开源趋势',
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
            <header className="border-b glass-effect sticky top-0 z-10">
              <div className="container mx-auto py-4 flex justify-between items-center">
                <Link href="/" className="font-bold text-lg">
                  GitHub 趋势爬虫
                </Link>
                <nav className="flex space-x-6">
                  <Link href="/" className="hover:text-primary transition-colors">
                    项目介绍
                  </Link>
                  <Link href="/dashboard" className="hover:text-primary transition-colors">
                    数据仪表盘
                  </Link>
                  <Link href="/daily" className="hover:text-primary transition-colors">
                    趋势分析
                  </Link>
                  <Link href="/keywords" className="hover:text-primary transition-colors">
                    关键词分析
                  </Link>
                  <Link href="/about" className="hover:text-primary transition-colors">
                    关于项目
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