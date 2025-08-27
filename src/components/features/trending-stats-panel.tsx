'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Star, GitFork, Code, Calendar, Activity, Zap } from 'lucide-react'
import { formatNumber } from '@/lib/utils/helpers'

interface TrendingStats {
  totalRepositories: number
  totalStars: number
  totalForks: number
  averageStars: number
  topLanguage: string
  topLanguageCount: number
  growthRate: number
  activeProjects: number
  lastUpdated: string
}

interface Repository {
  id?: number
  name: string
  owner: string
  fullName: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  todayStars: number
  url: string
  trendPeriod?: string
}

interface TrendingStatsPanelProps {
  repositories: Repository[]
  period: 'daily' | 'weekly' | 'monthly'
  className?: string
}

export function TrendingStatsPanel({ repositories, period, className }: TrendingStatsPanelProps) {
  const [stats, setStats] = useState<TrendingStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    calculateStats()
  }, [repositories, period])

  const calculateStats = () => {
    setLoading(true)
    
    if (!repositories || repositories.length === 0) {
      setStats(null)
      setLoading(false)
      return
    }

    // 计算统计数据
    const totalRepositories = repositories.length
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stars, 0)
    const totalForks = repositories.reduce((sum, repo) => sum + repo.forks, 0)
    const averageStars = Math.round(totalStars / totalRepositories)

    // 计算语言分布
    const languageCount: Record<string, number> = {}
    repositories.forEach(repo => {
      if (repo.language) {
        languageCount[repo.language] = (languageCount[repo.language] || 0) + 1
      }
    })

    const topLanguageEntry = Object.entries(languageCount)
      .sort(([,a], [,b]) => b - a)[0]
    const topLanguage = topLanguageEntry ? topLanguageEntry[0] : 'Unknown'
    const topLanguageCount = topLanguageEntry ? topLanguageEntry[1] : 0

    // 计算增长率（基于todayStars）
    const totalTodayStars = repositories.reduce((sum, repo) => sum + (repo.todayStars || 0), 0)
    const growthRate = totalStars > 0 ? (totalTodayStars / totalStars) * 100 : 0

    // 计算活跃项目数（有今日star增长的项目）
    const activeProjects = repositories.filter(repo => (repo.todayStars || 0) > 0).length

    const stats: TrendingStats = {
      totalRepositories,
      totalStars,
      totalForks,
      averageStars,
      topLanguage,
      topLanguageCount,
      growthRate,
      activeProjects,
      lastUpdated: new Date().toLocaleString('zh-CN')
    }

    setStats(stats)
    setLoading(false)
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'daily': return '今日'
      case 'weekly': return '本周'
      case 'monthly': return '本月'
      default: return '当前'
    }
  }

  const getGrowthIcon = (rate: number) => {
    if (rate > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />
    } else if (rate < 0) {
      return <TrendingDown className="w-4 h-4 text-red-500" />
    } else {
      return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">暂无统计数据</p>
        </CardContent>
      </Card>
    )
  }

  const statCards = [
    {
      title: '项目总数',
      value: formatNumber(stats.totalRepositories),
      icon: <Code className="w-5 h-5 text-blue-500" />,
      description: `${getPeriodLabel(period)}趋势项目`,
      color: 'text-blue-600'
    },
    {
      title: '总 Star 数',
      value: formatNumber(stats.totalStars),
      icon: <Star className="w-5 h-5 text-yellow-500" />,
      description: `平均 ${formatNumber(stats.averageStars)} stars`,
      color: 'text-yellow-600'
    },
    {
      title: '总 Fork 数',
      value: formatNumber(stats.totalForks),
      icon: <GitFork className="w-5 h-5 text-green-500" />,
      description: `${getPeriodLabel(period)}累计`,
      color: 'text-green-600'
    },
    {
      title: '活跃项目',
      value: `${stats.activeProjects}`,
      icon: <Zap className="w-5 h-5 text-purple-500" />,
      description: `${((stats.activeProjects / stats.totalRepositories) * 100).toFixed(1)}% 有增长`,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className={className}>
      {/* 主要统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">{stat.title}</span>
                {stat.icon}
              </div>
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <p className="text-xs text-gray-500">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 详细信息卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">热门语言</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-sm">
                {stats.topLanguage}
              </Badge>
              <span className="text-sm text-gray-600">
                {stats.topLanguageCount} 个项目
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">增长趋势</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getGrowthIcon(stats.growthRate)}
                <span className={`text-sm font-medium ${
                  stats.growthRate > 0 ? 'text-green-600' : 
                  stats.growthRate < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stats.growthRate > 0 ? '+' : ''}{stats.growthRate.toFixed(2)}%
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {getPeriodLabel(period)}增长率
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">最后更新</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {stats.lastUpdated}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
