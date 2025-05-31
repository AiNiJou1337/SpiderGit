'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Github, Code, Star, GitFork, UserCheck, BarChart3, LineChart, Layers, Database, Cpu } from 'lucide-react'

export default function IntroductionPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-8">
        {/* 项目标题和简介 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">GitHub趋势爬虫与分析平台</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            探索GitHub热门项目，挖掘编程语言与开源趋势
          </p>
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
                title="实时数据仪表盘"
                description="展示项目总数、星标总数、语言分布等关键指标"
                gradient="from-blue-500/10 to-indigo-500/10"
              />
              <FeatureCard 
                icon={<LineChart className="w-8 h-8 text-green-500" />}
                title="趋势可视化"
                description="多维度图表展示开源项目发展趋势"
                gradient="from-green-500/10 to-teal-500/10"
              />
              <FeatureCard 
                icon={<Layers className="w-8 h-8 text-purple-500" />}
                title="语言分布分析"
                description="直观展示不同编程语言的流行度和使用情况"
                gradient="from-purple-500/10 to-pink-500/10"
              />
              <FeatureCard 
                icon={<Code className="w-8 h-8 text-yellow-500" />}
                title="库与依赖分析"
                description="分析项目中使用的热门库和框架"
                gradient="from-yellow-500/10 to-orange-500/10"
              />
              <FeatureCard 
                icon={<Cpu className="w-8 h-8 text-red-500" />}
                title="自动化爬虫"
                description="支持定时任务，保持数据更新"
                gradient="from-red-500/10 to-rose-500/10"
              />
              <FeatureCard 
                icon={<UserCheck className="w-8 h-8 text-teal-500" />}
                title="关键词分析"
                description="按技术关键词抓取并分析GitHub仓库"
                gradient="from-teal-500/10 to-cyan-500/10"
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
                title="前端"
                items={[
                  "Next.js 13",
                  "React",
                  "TypeScript",
                  "TailwindCSS",
                  "Shadcn UI",
                  "Recharts"
                ]}
                gradient="from-blue-500/10 to-indigo-500/10"
              />
              <TechStackCard 
                title="后端"
                items={[
                  "Next.js API Routes",
                  "Python",
                  "FastAPI"
                ]}
                gradient="from-green-500/10 to-teal-500/10"
              />
              <TechStackCard 
                title="数据库"
                items={[
                  "PostgreSQL",
                  "Prisma ORM"
                ]}
                gradient="from-amber-500/10 to-orange-500/10"
              />
              <TechStackCard 
                title="爬虫"
                items={[
                  "Python",
                  "BeautifulSoup",
                  "Requests",
                  "GitHub API"
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
                  title="数据爬取"
                  description="爬虫模块从GitHub抓取仓库数据，按关键词和语言分类，存储到数据库"
                  icon={<Github className="w-12 h-12 text-blue-500" />}
                  gradient="from-blue-500/20 to-indigo-500/20"
                />
                <WorkflowStep 
                  step="2"
                  title="数据分析"
                  description="分析模块处理原始数据，生成趋势报告、语言分布和依赖分析"
                  icon={<Database className="w-12 h-12 text-purple-500" />}
                  gradient="from-purple-500/20 to-violet-500/20"
                />
                <WorkflowStep 
                  step="3"
                  title="可视化展示"
                  description="前端应用通过API获取数据，以图表和交互式界面展示分析结果"
                  icon={<BarChart3 className="w-12 h-12 text-green-500" />}
                  gradient="from-green-500/20 to-emerald-500/20"
                />
              </div>
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
                href="/daily"
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
}

function FeatureCard({ icon, title, description, gradient = "from-blue-500/10 to-purple-500/10" }: FeatureCardProps) {
  return (
    <div className={`p-6 rounded-lg border glass-card bg-gradient-to-br ${gradient} hover:shadow-md transition-all`}>
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
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
