'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Star, 
  GitFork, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Calendar,
  Activity,
  Zap,
  Heart,
  Bookmark
} from 'lucide-react'
import Link from 'next/link'
import { formatNumber, formatDate } from '@/lib/utils/helpers'
import { getLanguageColor } from '@/lib/utils/language-colors'

export type Repository = {
  id?: number
  name: string
  owner: string
  fullName: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  todayStars: number
  url?: string
  trendPeriod?: string
  createdAt?: string
  updatedAt?: string
  issues?: number
  watchers?: number
  size?: number
}

type EnhancedRepositoryCardProps = {
  repository: Repository
  periodLabel?: string
  onClick?: () => void
  className?: string
  showDetailedStats?: boolean
  showTrendIndicator?: boolean
  isBookmarked?: boolean
  onBookmark?: (repo: Repository) => void
}

export function EnhancedRepositoryCard({ 
  repository, 
  periodLabel = "今日新增",
  onClick,
  className,
  showDetailedStats = true,
  showTrendIndicator = true,
  isBookmarked = false,
  onBookmark
}: EnhancedRepositoryCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  // 计算热度评分 (0-100)
  const calculateHeatScore = () => {
    const starWeight = 0.4
    const forkWeight = 0.3
    const growthWeight = 0.3
    
    const normalizedStars = Math.min(repository.stars / 10000, 1) * 100
    const normalizedForks = Math.min(repository.forks / 2000, 1) * 100
    const normalizedGrowth = Math.min(repository.todayStars / 100, 1) * 100
    
    return Math.round(
      normalizedStars * starWeight + 
      normalizedForks * forkWeight + 
      normalizedGrowth * growthWeight
    )
  }

  // 获取趋势指示器
  const getTrendIndicator = () => {
    const growth = repository.todayStars || 0
    if (growth > 50) {
      return { icon: <Zap className="w-4 h-4" />, color: 'text-orange-500', label: '火爆' }
    } else if (growth > 20) {
      return { icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-500', label: '热门' }
    } else if (growth > 0) {
      return { icon: <Activity className="w-4 h-4" />, color: 'text-blue-500', label: '上升' }
    } else {
      return { icon: <TrendingDown className="w-4 h-4" />, color: 'text-gray-400', label: '平稳' }
    }
  }

  // 获取语言颜色样式
  const getLanguageStyle = (language: string | null) => {
    if (!language) return { backgroundColor: '#6b7280', color: '#ffffff' }
    
    const color = getLanguageColor(language)
    return {
      backgroundColor: color,
      color: '#ffffff',
      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
    }
  }

  const heatScore = calculateHeatScore()
  const trendIndicator = getTrendIndicator()

  return (
    <Card 
      className={`group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3 relative">
        {/* 热度指示器 */}
        {showTrendIndicator && (
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <Badge 
              variant="secondary" 
              className={`${trendIndicator.color} bg-white/80 backdrop-blur-sm`}
            >
              {trendIndicator.icon}
              <span className="ml-1 text-xs">{trendIndicator.label}</span>
            </Badge>
            {onBookmark && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-white/80"
                onClick={(e) => {
                  e.stopPropagation()
                  onBookmark(repository)
                }}
              >
                <Bookmark 
                  className={`w-4 h-4 ${isBookmarked ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} 
                />
              </Button>
            )}
          </div>
        )}

        <div className="flex items-start justify-between pr-16">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 group-hover:underline">
              {repository.url ? (
                <Link
                  href={repository.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {repository.name}
                </Link>
              ) : (
                <span className="block truncate">
                  {repository.name}
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center space-x-2">
              <span>
                {typeof repository.owner === 'string' ? repository.owner :
                 typeof repository.owner === 'object' && repository.owner?.login ? repository.owner.login :
                 'Unknown'}
              </span>
              {repository.createdAt && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(repository.createdAt)}</span>
                  </span>
                </>
              )}
            </CardDescription>
          </div>
        </div>

        {/* 语言标签 */}
        {repository.language && (
          <Badge 
            className="absolute top-12 right-4 text-xs font-medium border-0"
            style={getLanguageStyle(repository.language)}
          >
            {repository.language}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        {/* 项目描述 */}
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-4 leading-relaxed">
          {repository.description || '暂无描述'}
        </p>

        {/* 热度评分条 */}
        {showDetailedStats && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">热度评分</span>
              <span className="text-xs font-bold text-gray-800">{heatScore}/100</span>
            </div>
            <Progress 
              value={heatScore} 
              className="h-2"
              style={{
                background: `linear-gradient(to right, 
                  ${heatScore < 30 ? '#ef4444' : heatScore < 70 ? '#f59e0b' : '#10b981'} 0%, 
                  ${heatScore < 30 ? '#ef4444' : heatScore < 70 ? '#f59e0b' : '#10b981'} ${heatScore}%, 
                  #e5e7eb ${heatScore}%)`
              }}
            />
          </div>
        )}

        {/* 统计数据 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">{formatNumber(repository.stars)}</span>
              <span className="text-xs">stars</span>
            </div>
            
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <GitFork className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{formatNumber(repository.forks)}</span>
              <span className="text-xs">forks</span>
            </div>
          </div>

          <div className="space-y-2">
            {repository.watchers !== undefined && (
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{formatNumber(repository.watchers)}</span>
                <span className="text-xs">watching</span>
              </div>
            )}

            {repository.todayStars > 0 && (
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">+{formatNumber(repository.todayStars)}</span>
                <span className="text-xs">{periodLabel}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
          {repository.fullName}
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {/* 爱心按钮 */}
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              // 这里可以添加点赞功能
            }}
          >
            <Heart className="w-4 h-4 text-red-400 hover:fill-red-400" />
          </Button>


        </div>
      </CardFooter>

      {/* 悬停效果 */}
      {isHovered && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg pointer-events-none" />
      )}
    </Card>
  )
}
