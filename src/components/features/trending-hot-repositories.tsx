'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Star, GitFork, TrendingUp, RefreshCw } from 'lucide-react'
import { formatNumber } from '@/lib/utils/helpers'

interface Repository {
  id: number
  name: string
  full_name: string
  owner: {
    login: string
    avatar_url: string
  }
  description: string
  html_url: string
  language: string
  stargazers_count: number
  forks_count: number
  today_stars?: number
  created_at: string
  updated_at: string
}

interface TrendingHotRepositoriesProps {
  className?: string
  limit?: number
}

export function TrendingHotRepositories({ className, limit = 6 }: TrendingHotRepositoriesProps) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHotRepositories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 获取月度趋势数据，按星标新增数目排序
      const response = await fetch(`/api/trends?period=monthly&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error(`获取数据失败: ${response.status}`)
      }
      
      const data = await response.json()
      
      // 按今日新增星标数排序，取前6名
      const sortedRepos = (data.data || [])
        .sort((a: Repository, b: Repository) => (b.today_stars || 0) - (a.today_stars || 0))
        .slice(0, limit)
      
      setRepositories(sortedRepos)
      
    } catch (error) {
      console.error('获取热门仓库失败:', error)
      setError(error instanceof Error ? error.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHotRepositories()
  }, [limit])

  const handleRefresh = () => {
    fetchHotRepositories()
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-orange-700 dark:text-orange-300">
            热门仓库
          </CardTitle>
          <CardDescription>本月按星标新增数目排序的前{limit}名</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: limit }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
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
          <CardTitle className="text-lg font-semibold text-orange-700 dark:text-orange-300">
            热门仓库
          </CardTitle>
          <CardDescription>本月按星标新增数目排序的前{limit}名</CardDescription>
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
          <CardTitle className="text-lg font-semibold text-orange-700 dark:text-orange-300">
            热门仓库
          </CardTitle>
          <CardDescription>本月按星标新增数目排序的前{limit}名</CardDescription>
        </div>
        <Button onClick={handleRefresh} variant="ghost" size="sm">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {repositories.map((repo, index) => (
            <div
              key={repo.id}
              className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              {/* 排名 */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              
              {/* 仓库信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium text-sm truncate">
                    {repo.full_name}
                  </h3>
                  {repo.language && (
                    <Badge variant="secondary" className="text-xs">
                      {repo.language}
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {repo.description}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3" />
                    <span>{formatNumber(repo.stargazers_count)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <GitFork className="w-3 h-3" />
                    <span>{formatNumber(repo.forks_count)}</span>
                  </div>
                  {repo.today_stars && repo.today_stars > 0 && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <TrendingUp className="w-3 h-3" />
                      <span>+{formatNumber(repo.today_stars)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 外部链接 */}
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 p-1 h-8 w-8"
                onClick={() => window.open(repo.html_url, '_blank')}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
        
        {repositories.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">暂无热门仓库数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
