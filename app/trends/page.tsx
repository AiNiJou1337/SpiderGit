'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RepositoryCard } from '@/components/features/repository-card'
import { EnhancedRepositoryCard } from '@/components/features/enhanced-repository-card'
import { TrendingStatsPanel } from '@/components/features/trending-stats-panel'
import { TrendingCharts } from '@/components/features/trending-charts'
// import { AdvancedFilters } from '@/components/features/advanced-filters'
import { AdvancedExport } from '@/components/features/advanced-export'
import { TrendingCalendar } from '@/src/components/features/trending-calendar'
import { TimeSeriesAnalysis } from '@/src/components/features/time-series-analysis'
import { TrendingPageSkeleton, ErrorState, EmptyState } from '@/components/ui/loading-skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, Grid3X3, RefreshCw, Filter, Calendar, TrendingUp, Clock, Plus, ChevronLeft, ChevronRight } from 'lucide-react'

interface Repository {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  stargazers_count: number
  language: string
  forks_count: number
  open_issues_count: number
  created_at: string
  updated_at: string
  topics: string[]
  license?: {
    name: string
  }
  owner: {
    login: string
    avatar_url: string
  }
  // 添加兼容字段
  stars?: number
  forks?: number
  todayStars?: number
  today_stars?: number
}

interface TrendsData {
  daily: Repository[]
  weekly: Repository[]
  monthly: Repository[]
}

export default function TrendsPage() {
  const [trendsData, setTrendsData] = useState<TrendsData>({ daily: [], weekly: [], monthly: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('daily')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'growth' | 'stars' | 'forks' | 'updated'>('growth')
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(100) // 可调整每页显示数量

  // 数据转换函数：将 Repository 转换为 AdvancedFilters 期望的格式
  const convertToFilterFormat = (repos: Repository[]) => {
    return repos.map(repo => ({
      id: repo.id || 0,
      name: repo.name || '',
      owner: typeof repo.owner === 'string' ? repo.owner : repo.owner?.login || repo.full_name?.split('/')[0] || '',
      fullName: repo.full_name || '',
      description: repo.description || null,
      language: repo.language || null,
      stars: repo.stars || repo.stargazers_count || 0,
      forks: repo.forks || repo.forks_count || 0,
      todayStars: repo.todayStars || repo.today_stars || 0,
      url: repo.html_url || '',
      createdAt: repo.created_at || new Date().toISOString(),
      updatedAt: repo.updated_at || new Date().toISOString()
    }))
  }

  // 检查URL参数设置默认Tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')
      if (tabParam && ['daily', 'weekly', 'monthly'].includes(tabParam)) {
        setActiveTab(tabParam)
      }
    }
  }, [])

  // 获取趋势数据
  const fetchTrendsData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 直接调用后端 API 获取三个时间段的 Trending 数据
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch('/api/trends?period=daily&limit=300'),
        fetch('/api/trends?period=weekly&limit=300'),
        fetch('/api/trends?period=monthly&limit=300')
      ])

      if (!dailyRes.ok || !weeklyRes.ok || !monthlyRes.ok) {
        throw new Error('无法获取趋势数据')
      }

      const [dailyJson, weeklyJson, monthlyJson] = await Promise.all([
        dailyRes.json(), weeklyRes.json(), monthlyRes.json()
      ])

      const toRepo = (repo: any) => ({
        ...repo,
        // 确保字段映射正确
        stargazers_count: repo.stargazers_count ?? repo.stars ?? 0,
        forks_count: repo.forks_count ?? repo.forks ?? 0,
        stars: repo.stargazers_count ?? repo.stars ?? 0,
        forks: repo.forks_count ?? repo.forks ?? 0,
        todayStars: repo.today_stars ?? repo.todayStars ?? 0,
        updated_at: repo.updated_at || repo.updatedAt || new Date().toISOString()
      })

      const fixedData = {
        daily: (dailyJson.data || []).map(toRepo),
        weekly: (weeklyJson.data || []).map(toRepo),
        monthly: (monthlyJson.data || []).map(toRepo),
        lastUpdated: monthlyJson.metadata?.lastUpdated || new Date().toISOString(),
        metadata: {
          totalCount: (dailyJson.repositories?.length || 0) + (weeklyJson.repositories?.length || 0) + (monthlyJson.repositories?.length || 0)
        }
      }

      console.log('✅ 获取并修复后数据统计:', {
        daily: fixedData.daily?.length || 0,
        weekly: fixedData.weekly?.length || 0,
        monthly: fixedData.monthly?.length || 0
      })

      setTrendsData(fixedData)
      
    } catch (err) {
      console.error('获取趋势数据失败:', err)
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 初始化数据
  useEffect(() => {
    fetchTrendsData()
  }, [])

  // 排序函数
  const sortRepositories = (repos: Repository[], sortBy: string): Repository[] => {
    const sorted = [...repos]

    switch (sortBy) {
      case 'growth':
        return sorted.sort((a, b) => (b.todayStars || b.today_stars || 0) - (a.todayStars || a.today_stars || 0))
      case 'stars':
        return sorted.sort((a, b) => (b.stars || b.stargazers_count || 0) - (a.stars || a.stargazers_count || 0))
      case 'forks':
        return sorted.sort((a, b) => (b.forks || b.forks_count || 0) - (a.forks || a.forks_count || 0))
      case 'updated':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.updated_at || 0).getTime()
          const dateB = new Date(b.updated_at || 0).getTime()
          return dateB - dateA
        })
      default:
        return sorted
    }
  }

  // 当数据、标签页或排序方式改变时，更新filteredRepos
  useEffect(() => {
    const currentRepos = trendsData[activeTab as keyof TrendsData] || []

    console.log(`🔍 ${activeTab} 标签页数据:`, {
      原始数量: currentRepos.length,
      排序方式: sortBy
    })

    // 应用排序
    const sortedRepos = sortRepositories(currentRepos, sortBy)
    setFilteredRepos(sortedRepos)

    // 重置到第一页当切换tab时
    setCurrentPage(1)
  }, [trendsData, activeTab, sortBy])

  // 计算分页数据
  const totalPages = Math.ceil(filteredRepos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentRepos = filteredRepos.slice(startIndex, endIndex)

  console.log(`📊 分页计算:`, {
    总数据: filteredRepos.length,
    当前页: currentPage,
    总页数: totalPages,
    开始索引: startIndex,
    结束索引: endIndex,
    当前页数据: currentRepos.length
  })

  const handleRefresh = () => {
    fetchTrendsData()
  }

  const handleUpdateData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/trending/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('数据更新结果:', result)
        // 等待一段时间后重新获取数据，因为爬虫需要时间
        setTimeout(async () => {
          await fetchTrendsData()
        }, 3000)
      } else {
        console.error('数据更新失败')
      }
    } catch (error) {
      console.error('数据更新错误:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTabInfo = (tab: string) => {
    switch (tab) {
      case 'daily':
        return {
          title: '每日趋势',
          description: '展示过去24小时内最受欢迎的GitHub项目',
          icon: <Clock className="w-4 h-4" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        }
      case 'weekly':
        return {
          title: '每周趋势',
          description: '展示过去7天内最受欢迎的GitHub项目',
          icon: <Calendar className="w-4 h-4" />,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        }
      case 'monthly':
        return {
          title: '每月趋势',
          description: '展示过去30天内最受欢迎的GitHub项目',
          icon: <TrendingUp className="w-4 h-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        }
      default:
        return {
          title: '趋势分析',
          description: '',
          icon: null,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        }
    }
  }

  const currentTabInfo = getTabInfo(activeTab)

  console.log('🎨 准备渲染组件，trendsData:', {
    daily: trendsData.daily?.length || 0,
    weekly: trendsData.weekly?.length || 0,
    monthly: trendsData.monthly?.length || 0
  })

  return (
    <div className="container mx-auto py-6 space-y-6 relative z-10">
      {/* 页面标题 */}
      <Card className="glass-card bg-gradient-to-br from-blue-500/5 to-purple-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${currentTabInfo.bgColor}`}>
                {currentTabInfo.icon}
              </div>
              <div>
                <CardTitle className={`text-2xl ${currentTabInfo.color}`}>
                  GitHub 趋势分析
                </CardTitle>
                <CardDescription className="text-base">
                  {currentTabInfo.description}
                </CardDescription>
              </div>
            </div>

          </div>
        </CardHeader>
      </Card>

      {/* 趋势Tab切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="daily" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>每日趋势</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>每周趋势</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>每月趋势</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>日历分析</span>
          </TabsTrigger>
          <TabsTrigger value="timeseries" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>时序分析</span>
          </TabsTrigger>
        </TabsList>



        {/* Tab内容 */}
        <TabsContent value="daily" className="space-y-6">
          {loading ? (
            <TrendingPageSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={handleRefresh} />
          ) : currentRepos.length === 0 ? (
            <EmptyState
              title="暂无每日趋势数据"
              message="请点击刷新按钮获取最新数据"
              action={
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新数据
                </Button>
              }
            />
          ) : (
            <>
              {/* 统计面板 */}
              <TrendingStatsPanel
                repositories={convertToFilterFormat(filteredRepos)}
                period="daily"
                className="mb-6"
              />

              {/* 图表分析 */}
              <TrendingCharts
                repositories={convertToFilterFormat(filteredRepos)}
                period="daily"
              />

              {/* 导出数据 */}
              <AdvancedExport
                repositories={convertToFilterFormat(currentRepos)}
                period="daily"
                className="mb-6"
              />

              {/* 项目统计信息 */}
              <div className="text-sm text-muted-foreground mb-6 text-center">
                共 {filteredRepos.length} 个项目，第 {currentPage}/{totalPages} 页
              </div>

              {/* 高级筛选 - 出现问题暂时弃用 */}
              {/* <AdvancedFilters
                repositories={convertToFilterFormat(trendsData[activeTab as keyof TrendsData] || [])}
                onFiltersChange={(filtered, activeFilters) => {
                  // 将筛选后的数据转换回原始格式
                  const convertedBack = filtered.map(repo => ({
                    id: repo.id || 0,
                    name: repo.name || '',
                    full_name: repo.fullName || '',
                    description: repo.description || '',
                    html_url: repo.url || '',
                    stargazers_count: repo.stars || 0,
                    language: repo.language || '',
                    forks_count: repo.forks || 0,
                    open_issues_count: 0,
                    created_at: repo.createdAt || '',
                    updated_at: repo.updatedAt || '',
                    topics: []
                  }))
                  setFilteredRepos(convertedBack)
                }}
                className="mb-6"
              /> */}

              {/* 工具栏 */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 mb-6">
                <div className="flex items-center space-x-4">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="排序方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="growth">按星标增长趋势</SelectItem>
                      <SelectItem value="stars">按星标数</SelectItem>
                      <SelectItem value="forks">按Fork数</SelectItem>
                      <SelectItem value="updated">按更新时间</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleUpdateData}
                    disabled={loading}
                    variant="default"
                    size="sm"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    更新数据
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 主要内容区域 */}
              <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <div className="flex items-center justify-between mb-6">
                  <TabsList>
                    <TabsTrigger value="grid" className="flex items-center space-x-2">
                      <Grid3X3 className="w-4 h-4" />
                      <span>项目列表 ({filteredRepos.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>详细分析</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="grid">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentRepos.map((repo, index) => (
                      <div
                        key={repo.id}
                        className="transition-all duration-200 hover:scale-105 hover:shadow-md"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <EnhancedRepositoryCard
                          repository={convertToFilterFormat([repo])[0]!}
                          periodLabel="今日新增"
                          showDetailedStats={true}
                          showTrendIndicator={true}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="list" className="space-y-4">
                  {currentRepos.map((repo, index) => (
                    <div
                      key={repo.id}
                      className="transition-all duration-200"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <RepositoryCard repository={convertToFilterFormat([repo])[0]!} />
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          {loading ? (
            <TrendingPageSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={handleRefresh} />
          ) : currentRepos.length === 0 ? (
            <EmptyState
              title="暂无每周趋势数据"
              message="请点击刷新按钮获取最新数据"
              action={
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新数据
                </Button>
              }
            />
          ) : (
            <>
              {/* 统计面板 */}
              <TrendingStatsPanel
                repositories={convertToFilterFormat(filteredRepos)}
                period="weekly"
                className="mb-6"
              />

              {/* 图表分析 */}
              <TrendingCharts
                repositories={convertToFilterFormat(filteredRepos)}
                period="weekly"
              />

              {/* 导出数据 */}
              <AdvancedExport
                repositories={convertToFilterFormat(currentRepos)}
                period="weekly"
                className="mb-6"
              />

              {/* 项目统计信息 */}
              <div className="text-sm text-muted-foreground mb-6 text-center">
                共 {filteredRepos.length} 个项目，第 {currentPage}/{totalPages} 页
              </div>


              {/* 工具栏 */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 mb-6">
                <div className="flex items-center space-x-4">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="排序方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="growth">按星标增长趋势</SelectItem>
                      <SelectItem value="stars">按星标数</SelectItem>
                      <SelectItem value="forks">按Fork数</SelectItem>
                      <SelectItem value="updated">按更新时间</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleUpdateData}
                    disabled={loading}
                    variant="default"
                    size="sm"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    更新数据
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 主要内容区域 */}
              <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <div className="flex items-center justify-between mb-6">
                  <TabsList>
                    <TabsTrigger value="grid" className="flex items-center space-x-2">
                      <Grid3X3 className="w-4 h-4" />
                      <span>项目列表 ({filteredRepos.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>详细分析</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="grid">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentRepos.map((repo, index) => (
                      <div
                        key={repo.id}
                        className="transition-all duration-200 hover:scale-105 hover:shadow-md"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <EnhancedRepositoryCard
                          repository={convertToFilterFormat([repo])[0]!}
                          periodLabel="本周新增"
                          showDetailedStats={true}
                          showTrendIndicator={true}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="list" className="space-y-4">
                  {currentRepos.map((repo, index) => (
                    <div
                      key={repo.id}
                      className="transition-all duration-200"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <RepositoryCard repository={convertToFilterFormat([repo])[0]!} />
                    </div>
                  ))}
                </TabsContent>
              </Tabs>

              {/* 分页组件 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          {loading ? (
            <TrendingPageSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={handleRefresh} />
          ) : currentRepos.length === 0 ? (
            <EmptyState
              title="暂无每月趋势数据"
              message="请点击刷新按钮获取最新数据"
              action={
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新数据
                </Button>
              }
            />
          ) : (
            <>
              {/* 统计面板 */}
              <TrendingStatsPanel
                repositories={convertToFilterFormat(filteredRepos)}
                period="monthly"
                className="mb-6"
              />

              {/* 图表分析 */}
              <TrendingCharts
                repositories={convertToFilterFormat(filteredRepos)}
                period="monthly"
              />

              {/* 导出数据 */}
              <AdvancedExport
                repositories={convertToFilterFormat(currentRepos)}
                period="monthly"
                className="mb-6"
              />

              {/* 项目统计信息 */}
              <div className="text-sm text-muted-foreground mb-6 text-center">
                共 {filteredRepos.length} 个项目，第 {currentPage}/{totalPages} 页
              </div>

              {/* 高级筛选 - 暂时注释掉 */}
              {/* <AdvancedFilters
                repositories={convertToFilterFormat(trendsData[activeTab as keyof TrendsData] || [])}
                onFiltersChange={(filtered, activeFilters) => {
                  // 将筛选后的数据转换回原始格式
                  const convertedBack = filtered.map(repo => ({
                    id: repo.id || 0,
                    name: repo.name || '',
                    full_name: repo.fullName || '',
                    description: repo.description || '',
                    html_url: repo.url || '',
                    stargazers_count: repo.stars || 0,
                    language: repo.language || '',
                    forks_count: repo.forks || 0,
                    open_issues_count: 0,
                    created_at: repo.createdAt || '',
                    updated_at: repo.updatedAt || '',
                    topics: []
                  }))
                  setFilteredRepos(convertedBack)
                }}
                className="mb-6"
              /> */}

              {/* 工具栏 */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 mb-6">
                <div className="flex items-center space-x-4">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="排序方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="growth">星标增长趋势</SelectItem>
                      <SelectItem value="stars">按星标数</SelectItem>
                      <SelectItem value="forks">按Fork数</SelectItem>
                      <SelectItem value="updated">按更新时间</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleUpdateData}
                    disabled={loading}
                    variant="default"
                    size="sm"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    更新数据
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 主要内容区域 */}
              <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <div className="flex items-center justify-between mb-6">
                  <TabsList>
                    <TabsTrigger value="grid" className="flex items-center space-x-2">
                      <Grid3X3 className="w-4 h-4" />
                      <span>项目列表 ({filteredRepos.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>详细分析</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="grid">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentRepos.map((repo, index) => (
                      <div
                        key={repo.id}
                        className="transition-all duration-200 hover:scale-105 hover:shadow-md"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <EnhancedRepositoryCard
                          repository={convertToFilterFormat([repo])[0]!}
                          periodLabel="本月新增"
                          showDetailedStats={true}
                          showTrendIndicator={true}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="list" className="space-y-4">
                  {currentRepos.map((repo, index) => (
                    <div
                      key={repo.id}
                      className="transition-all duration-200"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <RepositoryCard repository={convertToFilterFormat([repo])[0]!} />
                    </div>
                  ))}
                </TabsContent>
              </Tabs>

              {/* 每页显示数量选择器 */}
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">每页显示:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1) // 重置到第一页
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="300">300</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    共 {filteredRepos.length} 个项目
                  </span>
                </div>
              </div>

              {/* 分页组件 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* 日历分析标签页 */}
        <TabsContent value="calendar" className="space-y-6">
          <TrendingCalendar className="w-full" />
        </TabsContent>

        {/* 时序分析标签页 */}
        <TabsContent value="timeseries" className="space-y-6">
          <TimeSeriesAnalysis className="w-full" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
