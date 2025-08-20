'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RepositoryCard, Repository } from '@/components/features/repository-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { TrendingUp, Calendar, Filter, RefreshCw } from 'lucide-react'

interface TrendsAnalysisProps {
  defaultPeriod?: 'daily' | 'weekly' | 'monthly'
}

export function TrendsAnalysis({ 
  defaultPeriod = 'daily'
}: TrendsAnalysisProps) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly'>(defaultPeriod)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const router = useRouter()

  // 加载趋势数据
  const loadTrendingData = async (period: 'daily' | 'weekly' | 'monthly', language?: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // 构建 API URL
      const params = new URLSearchParams()
      if (language && language !== 'all') {
        params.append('language', language)
      }
      
      const url = `/api/trending/${period}${params.toString() ? `?${params.toString()}` : ''}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setRepositories(data.data || [])
        
        // 提取语言列表
        const uniqueLanguages = Array.from(
          new Set(data.data?.map((repo: Repository) => repo.language).filter(Boolean))
        ) as string[]
        setLanguages(uniqueLanguages.sort())
      } else {
        throw new Error(data.error || '获取数据失败')
      }
    } catch (err) {
      console.error('加载趋势数据失败:', err)
      setError(err instanceof Error ? err.message : '加载数据时发生错误')
      setRepositories([])
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadTrendingData(activePeriod, selectedLanguage)
  }, [activePeriod, selectedLanguage])

  // 处理周期变化
  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setActivePeriod(period)
    // 更新 URL
    router.push(`/${period}`)
  }

  // 处理语言筛选
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language)
  }

  // 刷新数据
  const handleRefresh = () => {
    loadTrendingData(activePeriod, selectedLanguage)
  }

  // 获取周期标签
  const getPeriodLabel = (period: string) => {
    const labels = {
      daily: '今日新增',
      weekly: '本周新增', 
      monthly: '本月新增'
    }
    return labels[period as keyof typeof labels] || '新增'
  }

  // 渲染加载状态
  const renderLoading = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex space-x-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  // 渲染错误状态
  const renderError = () => (
    <Alert variant="destructive">
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          重试
        </Button>
      </AlertDescription>
    </Alert>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              GitHub 趋势分析
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {repositories.length > 0 && `共 ${repositories.length} 个仓库`}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 语言筛选 */}
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="语言" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有语言</SelectItem>
                {languages.map(lang => (
                  <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* 刷新按钮 */}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 周期选择 */}
        <Tabs value={activePeriod} onValueChange={(value: any) => handlePeriodChange(value)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              每日趋势
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              每周趋势
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              每月趋势
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activePeriod} className="mt-6">
            {/* 筛选信息 */}
            {selectedLanguage !== 'all' && (
              <div className="mb-4">
                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                  <Filter className="w-3 h-3" />
                  语言: {selectedLanguage}
                </Badge>
              </div>
            )}
            
            {/* 内容区域 */}
            {loading ? (
              renderLoading()
            ) : error ? (
              renderError()
            ) : repositories.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">暂无趋势数据</p>
                <Button variant="outline" className="mt-4" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新加载
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {repositories.map((repo) => (
                  <RepositoryCard
                    key={repo.id || repo.fullName}
                    repository={repo}
                    periodLabel={getPeriodLabel(activePeriod)}
                    onClick={() => {
                      // 可以添加点击处理逻辑
                      console.log('Repository clicked:', repo.fullName)
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
