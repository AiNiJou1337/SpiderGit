'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Github, Code, Star, GitFork, UserCheck, BarChart3, LineChart, Layers, Database, Cpu } from 'lucide-react'
import Image from 'next/image'

export default function IntroductionPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-8">
        {/* 项目标题和简介 */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center mb-4">
            <div className="mb-6">
              <Image
                src="/logo.png"
                alt="GitHub趋势爬虫与分析平台"
                width={120}
                height={120}
                className="mx-auto"
              />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              GitHub趋势爬虫与分析平台
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              实时追踪GitHub热门项目，智能分析开源技术趋势，为开发者提供数据驱动的技术洞察
            </p>
          </div>
        </div>
        
        {/* 主要特性 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">✨ 功能特性</CardTitle>
            <CardDescription>
              我们的平台提供多种功能，帮助您探索GitHub生态系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<BarChart3 className="w-8 h-8 text-blue-500" />}
                title="热门仓库Dashboard"
                description="实时展示GitHub月度热门项目，按星标增长排序，支持多语言筛选"
                gradient="from-blue-500/10 to-indigo-500/10"
                link="/dashboard"
              />
              <FeatureCard
                icon={<LineChart className="w-8 h-8 text-green-500" />}
                title="趋势分析页面"
                description="日/周/月多时间维度趋势分析，支持分页浏览和高级筛选"
                gradient="from-green-500/10 to-teal-500/10"
                link="/trends"
              />
              <FeatureCard
                icon={<Layers className="w-8 h-8 text-purple-500" />}
                title="技术栈统计"
                description="可视化展示编程语言分布，识别技术趋势和流行度变化"
                gradient="from-purple-500/10 to-pink-500/10"
                link="/dashboard"
              />
              <FeatureCard
                icon={<Code className="w-8 h-8 text-yellow-500" />}
                title="时间序列分析"
                description="历史数据追踪，项目发展轨迹分析，趋势预测"
                gradient="from-yellow-500/10 to-orange-500/10"
                link="/trends"
              />
              <FeatureCard
                icon={<Cpu className="w-8 h-8 text-red-500" />}
                title="智能爬虫系统"
                description="自动抓取GitHub Trending数据，支持多Token管理和API限制处理"
                gradient="from-red-500/10 to-rose-500/10"
              />
              <FeatureCard
                icon={<UserCheck className="w-8 h-8 text-teal-500" />}
                title="日历热力图"
                description="直观展示每日趋势变化，识别热门项目爆发时间点"
                gradient="from-teal-500/10 to-cyan-500/10"
                link="/trends"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* 技术架构 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">🛠️ 技术架构</CardTitle>
            <CardDescription>
              我们使用现代技术栈打造高性能分析平台
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <TechStackCard
                title="前端框架"
                items={[
                  "Next.js 14 (App Router)",
                  "React 18",
                  "TypeScript",
                  "TailwindCSS",
                  "Shadcn/ui",
                  "Recharts"
                ]}
                gradient="from-blue-500/10 to-indigo-500/10"
              />
              <TechStackCard
                title="API & 后端"
                items={[
                  "Next.js API Routes",
                  "RESTful API",
                  "JSON数据存储",
                  "文件系统缓存"
                ]}
                gradient="from-green-500/10 to-teal-500/10"
              />
              <TechStackCard
                title="数据存储"
                items={[
                  "JSON文件存储",
                  "时间序列数据",
                  "静态资源管理",
                  "增量数据更新"
                ]}
                gradient="from-amber-500/10 to-orange-500/10"
              />
              <TechStackCard
                title="爬虫系统"
                items={[
                  "Python 3.8+",
                  "BeautifulSoup4",
                  "Requests",
                  "GitHub REST API",
                  "智能Token管理"
                ]}
                gradient="from-purple-500/10 to-pink-500/10"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* 系统架构图 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">🔄 系统工作流程</CardTitle>
            <CardDescription>
              数据从爬取到分析再到展示的完整流程
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-muted rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <WorkflowStep
                  step="1"
                  title="智能数据采集"
                  description="Python爬虫自动抓取GitHub Trending页面，结合API获取详细仓库信息，支持多时间维度数据收集"
                  icon={<Github className="w-12 h-12 text-blue-500" />}
                  gradient="from-blue-500/20 to-indigo-500/20"
                />
                <WorkflowStep
                  step="2"
                  title="数据处理存储"
                  description="实时处理爬取数据，生成时间序列文件，按日/周/月分类存储，支持增量更新和历史追踪"
                  icon={<Database className="w-12 h-12 text-purple-500" />}
                  gradient="from-purple-500/20 to-violet-500/20"
                />
                <WorkflowStep
                  step="3"
                  title="智能分析展示"
                  description="Next.js前端通过RESTful API获取数据，提供Dashboard、趋势分析、日历热力图等多种可视化方式"
                  icon={<BarChart3 className="w-12 h-12 text-green-500" />}
                  gradient="from-green-500/20 to-emerald-500/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 实时数据统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">📊 平台数据概览</CardTitle>
            <CardDescription>
              基于最新收集的GitHub趋势数据统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="热门仓库"
                value="1,362+"
                description="已收集的热门项目"
                icon={<Star className="w-8 h-8 text-yellow-500" />}
                gradient="from-yellow-500/10 to-orange-500/10"
              />
              <StatCard
                title="编程语言"
                value="26+"
                description="涵盖的技术栈"
                icon={<Code className="w-8 h-8 text-blue-500" />}
                gradient="from-blue-500/10 to-indigo-500/10"
              />
              <StatCard
                title="数据更新"
                value="实时"
                description="自动化数据收集"
                icon={<Cpu className="w-8 h-8 text-green-500" />}
                gradient="from-green-500/10 to-teal-500/10"
              />
              <StatCard
                title="时间跨度"
                value="日/周/月"
                description="多维度趋势分析"
                icon={<BarChart3 className="w-8 h-8 text-purple-500" />}
                gradient="from-purple-500/10 to-pink-500/10"
              />
            </div>
          </CardContent>
        </Card>

        {/* UI设计特点 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">🎨 UI设计</CardTitle>
            <CardDescription>
              现代化的用户界面设计，提供出色的视觉体验
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UIFeatureCard 
                title="渐变背景"
                description="柔和的蓝紫色渐变，提供舒适的视觉体验，减轻长时间使用的视觉疲劳"
                gradient="from-blue-500/10 to-purple-500/10"
              />
              <UIFeatureCard 
                title="毛玻璃效果"
                description="卡片组件采用磨砂玻璃设计，增强层次感，让内容更加突出"
                gradient="from-teal-500/10 to-cyan-500/10"
              />
              <UIFeatureCard 
                title="响应式布局"
                description="完美适配桌面和移动设备，在任何屏幕尺寸下都能提供良好的用户体验"
                gradient="from-amber-500/10 to-orange-500/10"
              />
              <UIFeatureCard 
                title="暗色模式"
                description="支持深色主题，在低光环境下保护眼睛，提供更舒适的浏览体验"
                gradient="from-gray-500/10 to-slate-500/10"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* 开始使用 */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">🚀 立即开始</CardTitle>
            <CardDescription>
              开始探索GitHub趋势，发现优质开源项目
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-4">
              <Link 
                href="/dashboard"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                进入仪表盘
              </Link>
              <Link
                href="/trends"
                className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                趋势分析
              </Link>
              <Link 
                href="/keywords"
                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
              >
                关键词分析
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// 特性卡片组件
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient?: string;
  link?: string;
}

function FeatureCard({ icon, title, description, gradient = "from-blue-500/10 to-purple-500/10", link }: FeatureCardProps) {
  const content = (
    <div className={`p-6 rounded-lg border glass-card bg-gradient-to-br ${gradient} hover:shadow-md transition-all ${link ? 'cursor-pointer hover:scale-105' : ''}`}>
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )

  if (link) {
    return <Link href={link}>{content}</Link>
  }

  return content
}

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  gradient?: string;
}

function StatCard({ title, value, description, icon, gradient = "from-blue-500/10 to-purple-500/10" }: StatCardProps) {
  return (
    <div className={`p-6 rounded-lg border glass-card bg-gradient-to-br ${gradient} text-center`}>
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-lg font-medium mb-2">{title}</div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

// 技术栈卡片组件
interface TechStackCardProps {
  title: string;
  items: string[];
  gradient?: string;
}

function TechStackCard({ title, items, gradient = "from-indigo-500/10 to-cyan-500/10" }: TechStackCardProps) {
  return (
    <div className={`p-6 rounded-lg border glass-card bg-gradient-to-br ${gradient}`}>
      <h3 className="text-lg font-medium mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
            <span className="text-sm">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// 工作流程步骤组件
interface WorkflowStepProps {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient?: string;
}

function WorkflowStep({ step, title, description, icon, gradient = "from-green-500/10 to-blue-500/10" }: WorkflowStepProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`glass-effect bg-gradient-to-br ${gradient} rounded-full p-4 mb-4`}>
        {icon}
      </div>
      <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mb-2">
        {step}
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

// UI特性卡片组件
interface UIFeatureCardProps {
  title: string;
  description: string;
  gradient?: string;
}

function UIFeatureCard({ title, description, gradient = "from-pink-500/10 to-purple-500/10" }: UIFeatureCardProps) {
  return (
    <div className={`p-6 rounded-lg border glass-card bg-gradient-to-br ${gradient} hover:shadow-md transition-all`}>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
