import { Navbar } from '@/components/navbar'

export default function About() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-2">关于项目</h1>
      <p className="text-muted-foreground mb-6">GitHub Trending 数据抓取项目介绍</p>
      
      <Navbar />
      
      <div className="prose max-w-none">
        <h2 className="text-2xl font-semibold mt-8 mb-4">项目概述</h2>
        <p>
          本项目是一个自动化抓取 GitHub Trending 页面数据的应用，通过定时任务获取 GitHub 上最热门的开源项目，
          并提供友好的用户界面进行展示。用户可以查看每日、每周和每月的热门项目，按编程语言进行筛选，
          快速了解开源社区的最新动态。
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">技术栈</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>前端</strong>: Next.js 13 (App Router), React, TypeScript, TailwindCSS, ShadcnUI</li>
          <li><strong>后端</strong>: Python (爬虫), Next.js API Routes</li>
          <li><strong>数据库</strong>: PostgreSQL, Prisma ORM</li>
          <li><strong>部署</strong>: 可部署在Vercel (前端) 和任何支持Python的服务器 (爬虫)</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">功能特点</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>自动抓取 GitHub Trending 页面数据</li>
          <li>支持每日、每周、每月三种时间维度的趋势展示</li>
          <li>按编程语言筛选项目</li>
          <li>展示项目详细信息（星标数、分叉数、语言等）</li>
          <li>响应式设计，支持各种设备访问</li>
          <li>定时更新数据，保持信息的实时性</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">使用指南</h2>
        <p>
          在首页或通过导航栏，您可以访问不同时间维度的 GitHub 趋势项目：
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>每日趋势</strong>: 展示过去24小时内最受欢迎的项目</li>
          <li><strong>每周趋势</strong>: 展示过去一周内最受欢迎的项目</li>
          <li><strong>每月趋势</strong>: 展示过去一个月内最受欢迎的项目</li>
        </ul>
        <p className="mt-4">
          在每个页面底部，您可以通过语言标签筛选特定编程语言的项目。点击项目卡片上的"查看项目"按钮，
          可以直接跳转到 GitHub 上的项目页面。
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">数据更新频率</h2>
        <p>
          本项目的数据通过定时任务自动更新：
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>每日趋势数据: 每天凌晨2点更新</li>
          <li>每周趋势数据: 每周一凌晨3点更新</li>
          <li>每月趋势数据: 每月1日凌晨4点更新</li>
        </ul>
      </div>
    </div>
  )
}