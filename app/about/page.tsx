'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Github, Code, Braces, BarChart2 } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">关于 GitHub 趋势爬虫</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            探索和了解我们如何打造这个GitHub趋势分析平台
          </p>
        </div>
        
        {/* 项目概述 */}
        <Card className="glass-card bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
          <CardHeader>
            <CardTitle className="text-2xl">项目概述</CardTitle>
            <CardDescription>
              GitHub趋势爬虫与分析平台的由来
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                GitHub趋势爬虫是一个全面的工具，旨在帮助开发者、技术爱好者和团队跟踪GitHub平台上的热门项目和编程语言趋势。
                通过自动化爬虫技术，我们定期收集GitHub上的项目数据，进行分析和可视化，为用户提供直观的趋势报告。
              </p>
              <p>
                无论您是想发现新的开源项目，研究编程语言的流行趋势，还是寻找行业中的技术方向，
                我们的平台都能提供有价值的数据洞察，帮助您做出更明智的技术决策。
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* 技术特性 */}
        <Card className="glass-card bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <CardHeader>
            <CardTitle className="text-2xl">技术特性</CardTitle>
            <CardDescription>
              我们使用的核心技术
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureItem 
                icon={<Github className="w-8 h-8 text-blue-500" />}
                title="GitHub API 集成"
                description="使用官方API获取精确数据，结合网页爬虫获取额外信息"
              />
              <FeatureItem 
                icon={<Braces className="w-8 h-8 text-purple-500" />}
                title="Next.js 全栈架构"
                description="使用Next.js API Routes提供后端服务，React构建交互式前端"
              />
              <FeatureItem 
                icon={<BarChart2 className="w-8 h-8 text-green-500" />}
                title="数据可视化"
                description="使用Recharts创建丰富的交互式图表，直观展示趋势数据"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* 设计理念 */}
        <Card className="glass-card bg-gradient-to-br from-teal-500/10 to-green-500/10">
          <CardHeader>
            <CardTitle className="text-2xl">设计理念</CardTitle>
            <CardDescription>
              我们的UI/UX设计原则
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                我们的设计以简洁、直观和美观为核心原则。通过柔和的渐变背景和毛玻璃效果，
                创造出既现代又不分散注意力的界面，让用户能专注于数据和内容本身。
              </p>
              <p>
                所有的卡片组件采用磨砂玻璃设计，增强层次感的同时保持整体一致性。
                响应式布局确保在任何设备上都能获得最佳体验，而黑暗模式则提供了额外的视觉舒适度。
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="glass-card rounded-lg p-4 bg-gradient-to-br from-blue-500/15 to-purple-500/15">
                  <h3 className="font-medium mb-2">渐变与毛玻璃</h3>
                  <p className="text-sm text-muted-foreground">柔和的色彩过渡与半透明效果创造层次感</p>
                </div>
                <div className="glass-card rounded-lg p-4 bg-gradient-to-br from-green-500/15 to-teal-500/15">
                  <h3 className="font-medium mb-2">响应式设计</h3>
                  <p className="text-sm text-muted-foreground">完美适配从手机到桌面的所有设备尺寸</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 开发团队 */}
        <Card className="glass-card bg-gradient-to-br from-amber-500/10 to-orange-500/10">
          <CardHeader>
            <CardTitle className="text-2xl">开发团队</CardTitle>
            <CardDescription>
              关于我们
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
             本次项目是主要使用cursor，trae，pycharm等AIIDE辅助实现完成，作为团队学习项目使用，若有侵权，请联系删除。
            </p>
            <p>
              如果您对项目有任何建议或想法，欢迎通过GitHub仓库与我们联系，我们期待您的反馈！
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex flex-col items-center text-center p-4 glass-card rounded-lg border bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
      <div className="mb-3">
        {icon}
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
