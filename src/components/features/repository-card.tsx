import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, GitFork, ExternalLink, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { formatNumber } from '@/lib/utils/helpers'

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
}

type RepositoryCardProps = {
  repository: Repository
  periodLabel?: string // 用于显示"今日新增"、"本周新增"或"本月新增"
  onClick?: () => void
  className?: string
}

export function RepositoryCard({ 
  repository, 
  periodLabel = "今日新增",
  onClick,
  className 
}: RepositoryCardProps) {
  const getLanguageColor = (language: string | null) => {
    if (!language) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    
    // 根据不同语言返回不同的颜色
    const colors: Record<string, string> = {
      JavaScript: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      TypeScript: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Python: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Java: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      'C++': "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      Go: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
      Rust: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      PHP: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
      Ruby: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      Swift: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    }
    
    return colors[language] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }

  return (
    <Card 
      className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${className}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              {repository.url ? (
                <Link
                  href={repository.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {repository.name}
                </Link>
              ) : (
                <span>
                  {repository.name}
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {typeof repository.owner === 'string' ? repository.owner :
               typeof repository.owner === 'object' && repository.owner && (repository.owner as any).login ? (repository.owner as any).login :
               'Unknown'}
            </CardDescription>
          </div>
          
          {repository.language && (
            <Badge 
              variant="secondary" 
              className={`ml-2 ${getLanguageColor(repository.language)}`}
            >
              {repository.language}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-4">
          {repository.description || '暂无描述'}
        </p>

        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center">
            <Star className="w-4 h-4 mr-1 text-yellow-500" />
            <span>{formatNumber(repository.stars)}</span>
          </div>
          
          <div className="flex items-center">
            <GitFork className="w-4 h-4 mr-1 text-gray-500" />
            <span>{formatNumber(repository.forks)}</span>
          </div>
          
          {repository.todayStars > 0 && (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+{formatNumber(repository.todayStars)} {periodLabel}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {repository.fullName}
        </div>
      </CardFooter>
    </Card>
  )
}
