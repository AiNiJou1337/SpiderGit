'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RepositoryCard, Repository } from '@/components/repository-card'
import { SafeTabs as Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/safe-tabs'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()

  // 加载趋势数据
  const loadTrendingData = async (period: 'daily' | 'weekly' | 'monthly') => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/trending?period=${period}`)
      
      if (!response.ok) {
        throw new Error(`获取趋势数据失败: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      setRepositories(data.repositories || [])
      setLanguages(data.languages || [])
    } catch (err: any) {
      console.error('加载趋势数据时出错:', err)
      setError(err.message || '加载趋势数据时出错')
    } finally {
      setLoading(false)
    }
  }

  // 组件加载时获取数据
  useEffect(() => {
    loadTrendingData(activePeriod)
  }, [activePeriod])

  // 处理刷新按钮点击
  const handleRefresh = () => {
    loadTrendingData(activePeriod)
  }

  // 处理Tab切换
  const handlePeriodChange = (value: string) => {
    const period = value as 'daily' | 'weekly' | 'monthly'
    setActivePeriod(period)
    // 可选: 更新URL
    // router.push(`/trends/${period}`)
  }

  // 获取周期标签
  const getPeriodLabel = () => {
    switch (activePeriod) {
      case 'daily': return '今日新增'
      case 'weekly': return '本周新增'
      case 'monthly': return '本月新增'
      default: return '新增'
    }
  }

  // 获取标题文本
  const getTitleText = () => {
    switch (activePeriod) {
      case 'daily': return 'GitHub 每日趋势项目'
      case 'weekly': return 'GitHub 每周趋势项目'
      case 'monthly': return 'GitHub 每月趋势项目'
      default: return 'GitHub 趋势项目'
    }
  }

  // 加载状态显示
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span className="text-2xl font-bold">{getTitleText()}</span>
            <Button size="sm" disabled>加载中...</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="w-full h-[200px]" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // 错误状态显示
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span className="text-2xl font-bold">{getTitleText()}</span>
            <Button size="sm" onClick={handleRefresh}>重试</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span className="text-2xl font-bold">{getTitleText()}</span>
          <Button size="sm" onClick={handleRefresh}>更新数据</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <Tabs value={activePeriod} onValueChange={setActivePeriod} className="w-full">
              <TabsList className="grid w-full md:w-auto grid-cols-3 mb-6">
                <TabsTrigger value="daily">每日趋势</TabsTrigger>
                <TabsTrigger value="weekly">每周趋势</TabsTrigger>
                <TabsTrigger value="monthly">每月趋势</TabsTrigger>
              </TabsList>
              <TabsContent value="daily">
                {activePeriod === 'daily' && (
                  repositories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {repositories.map((repo) => (
                        <RepositoryCard 
                          key={repo.fullName} 
                          repository={repo} 
                          periodLabel="今日新增"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">暂无每日趋势数据</p>
                    </div>
                  )
                )}
              </TabsContent>
              <TabsContent value="weekly">
                {activePeriod === 'weekly' && (
                  repositories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {repositories.map((repo) => (
                        <RepositoryCard 
                          key={repo.fullName} 
                          repository={repo} 
                          periodLabel="本周新增"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">暂无每周趋势数据</p>
                    </div>
                  )
                )}
              </TabsContent>
              <TabsContent value="monthly">
                {activePeriod === 'monthly' && (
                  repositories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {repositories.map((repo) => (
                        <RepositoryCard 
                          key={repo.fullName} 
                          repository={repo} 
                          periodLabel="本月新增"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">暂无每月趋势数据</p>
                    </div>
                  )
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}