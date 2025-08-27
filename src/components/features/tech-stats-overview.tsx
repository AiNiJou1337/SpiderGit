'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, Code, TrendingUp, Users, Zap } from 'lucide-react'

interface TechStat {
  name: string
  count: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
  color: string
}

interface TechStatsOverviewProps {
  className?: string
}

export function TechStatsOverview({ className }: TechStatsOverviewProps) {
  const [techStats, setTechStats] = useState<TechStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalProjects, setTotalProjects] = useState(0)

  const fetchTechStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 获取技术栈统计数据
      const response = await fetch('/api/trends/stats?period=monthly')

      if (!response.ok) {
        throw new Error(`获取数据失败: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || '获取数据失败')
      }
      
      // 使用API返回的统计数据
      const statsData = data.data
      const languageDistribution = statsData.languageDistribution || []

      setTotalProjects(statsData.totalRepositories || 0)

      // 转换为组件需要的格式
      const stats: TechStat[] = languageDistribution
        .slice(0, 8)
        .map((item: any, index: number) => ({
          name: item.language,
          count: item.count,
          percentage: item.percentage,
          trend: index < 3 ? 'up' : index < 6 ? 'stable' : 'down',
          color: getLanguageColor(item.language)
        }))
      
      setTechStats(stats)
      
    } catch (error) {
      console.error('获取技术统计失败:', error)
      setError(error instanceof Error ? error.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTechStats()
  }, [])

  const handleRefresh = () => {
    fetchTechStats()
  }

  // 获取语言对应的颜色
  const getLanguageColor = (language: string): string => {
    const colors: { [key: string]: string } = {
      'JavaScript': '#f7df1e',
      'TypeScript': '#3178c6',
      'Python': '#3776ab',
      'Java': '#ed8b00',
      'Go': '#00add8',
      'Rust': '#000000',
      'C++': '#00599c',
      'C': '#a8b9cc',
      'PHP': '#777bb4',
      'Ruby': '#cc342d',
      'Swift': '#fa7343',
      'Kotlin': '#7f52ff',
      'C#': '#239120',
      'Vue': '#4fc08d',
      'React': '#61dafb',
      'Shell': '#89e051'
    }
    return colors[language] || '#8884d8'
  }

  // 获取趋势图标
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-500" />
      case 'down':
        return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-400" />
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-green-700 dark:text-green-300">
            技术栈概览
          </CardTitle>
          <CardDescription>热门技术栈分布统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 animate-pulse">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
                <div className="w-8 h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-green-700 dark:text-green-300">
            技术栈概览
          </CardTitle>
          <CardDescription>热门技术栈分布统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-green-700 dark:text-green-300">
            技术栈概览
          </CardTitle>
          <CardDescription>
            基于 {totalProjects} 个热门项目的技术栈分布
          </CardDescription>
        </div>
        <Button onClick={handleRefresh} variant="ghost" size="sm">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {techStats.map((stat, index) => (
            <div key={stat.name} className="flex items-center space-x-3">
              {/* 排名和趋势 */}
              <div className="flex items-center space-x-2 w-12">
                <span className="text-sm font-medium text-muted-foreground">
                  #{index + 1}
                </span>
                {getTrendIcon(stat.trend)}
              </div>
              
              {/* 语言信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stat.color }}
                    />
                    <span className="text-sm font-medium">{stat.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {stat.count}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {stat.percentage}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={stat.percentage} 
                  className="h-2"
                  style={{
                    '--progress-background': stat.color
                  } as React.CSSProperties}
                />
              </div>
            </div>
          ))}
        </div>
        
        {techStats.length === 0 && (
          <div className="text-center py-8">
            <Code className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">暂无技术栈数据</p>
          </div>
        )}
        
        {/* 底部统计信息 */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {techStats.length}
              </div>
              <div className="text-xs text-muted-foreground">技术栈</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {techStats.filter(s => s.trend === 'up').length}
              </div>
              <div className="text-xs text-muted-foreground">上升</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-orange-600">
                {totalProjects}
              </div>
              <div className="text-xs text-muted-foreground">项目总数</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
