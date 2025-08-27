'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Github, Code, Braces, BarChart2, Brain, Search, TrendingUp, Zap, Database, Shield } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">关于 GitHub 趋势爬虫</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            AI驱动的GitHub趋势分析平台，提供智能化的技术洞察和数据分析
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
                GitHub趋势爬虫是一个集成AI智能分析的全面平台，旨在帮助开发者、技术爱好者和团队深度了解GitHub生态系统。
                通过自动化爬虫技术和AI驱动的分析引擎，我们不仅收集GitHub上的项目数据，更提供智能化的技术洞察和趋势预测。
              </p>
              <p>
                平台提供多维度分析功能：从热门项目追踪到关键词深度分析，从编程语言趋势到项目质量评估，
                再到AI生成的技术报告和学习建议。无论您是寻找优质开源项目、研究技术发展方向，
                还是制定学习路径，我们的AI助手都能为您提供专业的技术分析和实用建议。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="glass-card rounded-lg p-4 bg-gradient-to-br from-blue-500/15 to-indigo-500/15">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
                    <h3 className="font-medium">趋势分析</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">实时追踪GitHub热门项目和技术趋势</p>
                </div>
                <div className="glass-card rounded-lg p-4 bg-gradient-to-br from-purple-500/15 to-pink-500/15">
                  <div className="flex items-center mb-2">
                    <Brain className="w-5 h-5 text-purple-500 mr-2" />
                    <h3 className="font-medium">AI智能分析</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">AI驱动的技术洞察和学习建议</p>
                </div>
                <div className="glass-card rounded-lg p-4 bg-gradient-to-br from-green-500/15 to-teal-500/15">
                  <div className="flex items-center mb-2">
                    <Search className="w-5 h-5 text-green-500 mr-2" />
                    <h3 className="font-medium">关键词分析</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">深度挖掘特定技术领域的项目生态</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 核心功能 */}
        <Card className="glass-card bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <CardHeader>
            <CardTitle className="text-2xl">核心功能</CardTitle>
            <CardDescription>
              平台提供的主要功能模块
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureItem
                icon={<TrendingUp className="w-8 h-8 text-blue-500" />}
                title="趋势分析"
                description="实时追踪GitHub热门项目，提供日/周/月多维度趋势分析"
              />
              <FeatureItem
                icon={<Search className="w-8 h-8 text-green-500" />}
                title="关键词分析"
                description="深度分析特定技术关键词，挖掘相关项目生态和发展趋势"
              />
              <FeatureItem
                icon={<Brain className="w-8 h-8 text-purple-500" />}
                title="AI智能总结"
                description="集成免费Groq API，提供AI驱动的技术分析报告和学习建议"
              />
              <FeatureItem
                icon={<Shield className="w-8 h-8 text-orange-500" />}
                title="质量评估"
                description="基于Stars、Forks、Issues等多维度评估项目质量和活跃度"
              />
              <FeatureItem
                icon={<BarChart2 className="w-8 h-8 text-teal-500" />}
                title="数据可视化"
                description="丰富的图表展示：散点图、雷达图、热力图、饼图等多种可视化"
              />
              <FeatureItem
                icon={<Database className="w-8 h-8 text-indigo-500" />}
                title="时间序列分析"
                description="历史数据追踪，支持项目发展轨迹和趋势变化分析"
              />
            </div>
          </CardContent>
        </Card>

        {/* 技术架构 */}
        <Card className="glass-card bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
          <CardHeader>
            <CardTitle className="text-2xl">技术架构</CardTitle>
            <CardDescription>
              现代化的全栈技术实现
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureItem
                icon={<Github className="w-8 h-8 text-blue-500" />}
                title="GitHub API 集成"
                description="官方API + 智能Token管理，确保数据获取的稳定性和准确性"
              />
              <FeatureItem
                icon={<Braces className="w-8 h-8 text-purple-500" />}
                title="Next.js 14 全栈"
                description="React 18 + TypeScript + TailwindCSS，现代化前端技术栈"
              />
              <FeatureItem
                icon={<Brain className="w-8 h-8 text-pink-500" />}
                title="AI 服务集成"
                description="Groq API + Llama3-8B模型，提供免费的AI分析能力"
              />
              <FeatureItem
                icon={<Code className="w-8 h-8 text-green-500" />}
                title="Python 爬虫引擎"
                description="BeautifulSoup4 + 多线程爬虫，高效的数据采集系统"
              />
              <FeatureItem
                icon={<Zap className="w-8 h-8 text-yellow-500" />}
                title="高性能缓存"
                description="智能缓存策略，优化API响应速度和用户体验"
              />
              <FeatureItem
                icon={<Database className="w-8 h-8 text-indigo-500" />}
                title="JSON 数据存储"
                description="轻量级文件存储，支持时间序列数据和增量更新"
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
        
        {/* 项目特色 */}
        <Card className="glass-card bg-gradient-to-br from-rose-500/10 to-pink-500/10">
          <CardHeader>
            <CardTitle className="text-2xl">项目特色</CardTitle>
            <CardDescription>
              我们的独特优势
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Brain className="w-5 h-5 text-purple-500 mr-2" />
                  AI驱动分析
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 开发中</li>
                  <li>• 开发中</li>
                  <li>• 开发中</li>
                  <li>• 开发中</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                  高效便捷
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 一键生成技术分析报告</li>
                  <li>• 智能Token管理，无需手动配置</li>
                  <li>• 响应式设计，完美适配各种设备</li>
                  <li>• 实时数据更新，信息始终最新</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据统计 */}
        <Card className="glass-card bg-gradient-to-br from-emerald-500/10 to-green-500/10">
          <CardHeader>
            <CardTitle className="text-2xl">平台数据</CardTitle>
            <CardDescription>
              项目规模与功能统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-500 mb-2">1,362+</div>
                <div className="text-sm text-muted-foreground">收集项目数</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-500 mb-2">26+</div>
                <div className="text-sm text-muted-foreground">编程语言</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500 mb-2">8+</div>
                <div className="text-sm text-muted-foreground">API端点</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500 mb-2">100%</div>
                <div className="text-sm text-muted-foreground">免费使用</div>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card rounded-lg p-4 bg-gradient-to-br from-blue-500/15 to-indigo-500/15">
                <h3 className="font-medium mb-2">📊 数据分析</h3>
                <p className="text-sm text-muted-foreground">
                  多维度数据可视化，支持散点图、雷达图、热力图等10+种图表类型
                </p>
              </div>
              <div className="glass-card rounded-lg p-4 bg-gradient-to-br from-purple-500/15 to-pink-500/15">
                <h3 className="font-medium mb-2">🤖 AI功能</h3>
                <p className="text-sm text-muted-foreground">
                  开发中
                </p>
              </div>
              <div className="glass-card rounded-lg p-4 bg-gradient-to-br from-green-500/15 to-teal-500/15">
                <h3 className="font-medium mb-2">⚡ 高性能</h3>
                <p className="text-sm text-muted-foreground">
                  智能缓存机制，API响应时间优化，支持实时数据更新
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 开发团队 */}
        <Card className="glass-card bg-gradient-to-br from-amber-500/10 to-orange-500/10">
          <CardHeader>
            <CardTitle className="text-2xl">开发信息</CardTitle>
            <CardDescription>
              关于项目开发
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                本项目采用现代化AI辅助开发模式，主要使用Augment、Cursor、Claude、PyCharm、vscode等AI IDE工具完成。
                项目集成了多项前沿技术，包括AI智能分析、实时数据可视化、响应式设计等。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card rounded-lg p-4 bg-gradient-to-br from-blue-500/15 to-indigo-500/15">
                  <h3 className="font-medium mb-2">🎯 项目目标</h3>
                  <p className="text-sm text-muted-foreground">
                    为开发者提供AI驱动的GitHub趋势分析工具，助力技术决策和学习成长
                  </p>
                </div>
                <div className="glass-card rounded-lg p-4 bg-gradient-to-br from-green-500/15 to-teal-500/15">
                  <h3 className="font-medium mb-2">🚀 技术创新</h3>
                  <p className="text-sm text-muted-foreground">
                    集成免费AI服务，实现零成本的智能分析，降低技术门槛
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                如果您对项目有任何建议或想法，欢迎通过GitHub仓库与我们联系。
                项目完全开源，欢迎贡献代码和提出改进建议！
              </p>
            </div>
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
