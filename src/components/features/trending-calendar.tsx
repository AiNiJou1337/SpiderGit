'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, History, RefreshCw, TrendingUp, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EnhancedRepositoryCard } from './enhanced-repository-card'
import { TrendingStatsPanel } from './trending-stats-panel'

interface TrendingCalendarProps {
  className?: string
}

interface HistoricalDate {
  date: string
  time: string
  filename: string
  displayDate: string
  displayTime: string
  fullTimestamp: string
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

export function TrendingCalendar({ className }: TrendingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availableDates, setAvailableDates] = useState<HistoricalDate[]>([])
  const [dateMap, setDateMap] = useState<Map<string, HistoricalDate[]>>(new Map())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDates, setLoadingDates] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // 获取可用的历史日期列表
  const fetchAvailableDates = async () => {
    setLoadingDates(true)
    try {
      const response = await fetch('/api/trending/history')
      if (response.ok) {
        const data = await response.json()
        const dates = data.dates || []
        setAvailableDates(dates)
        
        // 构建日期映射 (YYYY-MM-DD -> HistoricalDate[])
        const map = new Map<string, HistoricalDate[]>()
        dates.forEach((dateInfo: HistoricalDate) => {
          const existing = map.get(dateInfo.displayDate) || []
          existing.push(dateInfo)
          map.set(dateInfo.displayDate, existing)
        })
        setDateMap(map)
        
        console.log('📅 可用历史日期:', dates.length, '个')
      }
    } catch (error) {
      console.error('获取历史日期列表失败:', error)
    } finally {
      setLoadingDates(false)
    }
  }

  // 加载指定日期的数据
  const fetchDateData = async (dateTimestamp: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/trending/history?date=${dateTimestamp}`)
      if (response.ok) {
        const result = await response.json()
        const data = result.data
        
        // 提取每日趋势数据
        const dailyRepos = (data.daily || []).map((repo: any) => ({
          id: repo.id || 0,
          name: repo.name || '',
          owner: typeof repo.owner === 'string' ? repo.owner : repo.owner?.login || '',
          fullName: repo.full_name || repo.fullName || '',
          description: repo.description || null,
          language: repo.language || null,
          stars: repo.stars || repo.stargazers_count || 0,
          forks: repo.forks || repo.forks_count || 0,
          todayStars: repo.todayStars || repo.today_stars || 0,
          url: repo.html_url || repo.url || '',
          trendPeriod: 'daily'
        }))
        
        setRepositories(dailyRepos)
        console.log(`✅ 加载了 ${dateTimestamp} 的数据: ${dailyRepos.length} 个项目`)
      }
    } catch (error) {
      console.error('获取历史数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 初始化
  useEffect(() => {
    fetchAvailableDates()
  }, [])

  // 获取月份的天数和起始日期
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  // 导航到上个月
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDate(null)
    setRepositories([])
  }

  // 导航到下个月
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDate(null)
    setRepositories([])
  }

  // 格式化日期为字符串
  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // 处理日期点击
  const handleDayClick = (dateKey: string) => {
    const datesForDay = dateMap.get(dateKey)
    if (datesForDay && datesForDay.length > 0) {
      // 如果该日期有多个备份，选择最新的
      const latestDate = datesForDay.sort((a, b) => 
        b.fullTimestamp.localeCompare(a.fullTimestamp)
      )[0]
      
      setSelectedDate(dateKey)
      fetchDateData(latestDate!.fullTimestamp)
    }
  }

  // 获取日期的热度颜色
  const getDayColor = (dateKey: string, isToday: boolean, isSelected: boolean) => {
    const hasData = dateMap.has(dateKey)
    const dataCount = dateMap.get(dateKey)?.length || 0
    
    if (isSelected) {
      return 'bg-blue-500 text-white hover:bg-blue-600'
    }
    
    if (isToday) {
      return hasData 
        ? 'bg-purple-200 border-2 border-purple-500 hover:bg-purple-300' 
        : 'bg-purple-50 border-2 border-purple-500 hover:bg-purple-100'
    }
    
    if (!hasData) {
      return 'bg-gray-50 text-gray-400 cursor-default'
    }
    
    // 根据备份数量显示不同的绿色深度
    if (dataCount === 1) return 'bg-green-100 hover:bg-green-200'
    if (dataCount === 2) return 'bg-green-200 hover:bg-green-300'
    return 'bg-green-300 hover:bg-green-400'
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ]
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const selectedDateInfo = selectedDate ? dateMap.get(selectedDate)?.[0] : null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 日历卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <History className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl">历史趋势日历</CardTitle>
                <CardDescription>
                  点击日历上的日期查看该日的GitHub每日趋势数据
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-sm">
                {availableDates.length} 个历史记录
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAvailableDates}
                disabled={loadingDates}
              >
                <RefreshCw className={`w-4 h-4 ${loadingDates ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              上月
            </Button>
            <h3 className="text-lg font-semibold">
              {year}年 {monthNames[month]}
            </h3>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              下月
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* 日历网格 */}
          <div className="grid grid-cols-7 gap-2">
            {/* 空白天数（月初） */}
            {Array.from({ length: startingDayOfWeek }, (_, i) => (
              <div key={`empty-start-${i}`} className="h-16" />
            ))}

            {/* 月份天数 */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dateKey = formatDateKey(year, month, day)
              const hasData = dateMap.has(dateKey)
              const dataCount = dateMap.get(dateKey)?.length || 0
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()
              const isSelected = selectedDate === dateKey

              return (
                <div
                  key={day}
                  className={`
                    h-16 rounded-lg border-2 transition-all duration-200 cursor-pointer
                    flex flex-col items-center justify-center
                    ${getDayColor(dateKey, isToday, isSelected)}
                    ${hasData ? 'hover:shadow-lg hover:scale-105' : 'opacity-50'}
                  `}
                  onClick={() => hasData && handleDayClick(dateKey)}
                  title={hasData ? `${dateKey} - 点击查看趋势数据` : `${dateKey} - 暂无数据`}
                >
                  <span className={`text-lg font-semibold ${isSelected ? 'text-white' : ''}`}>
                    {day}
                  </span>
                  {hasData && (
                    <div className="flex items-center space-x-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-green-600'}`} />
                      {dataCount > 1 && (
                        <span className={`text-xs ${isSelected ? 'text-white' : 'text-green-700'}`}>
                          {dataCount}
                        </span>
                      )}
                    </div>
                  )}
                  {isToday && (
                    <div className={`text-xs mt-0.5 ${isSelected ? 'text-white' : 'text-purple-600'}`}>
                      今天
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 图例说明 */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-center space-x-6 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 rounded border"></div>
                <span className="text-muted-foreground">有1个备份</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-200 rounded border"></div>
                <span className="text-muted-foreground">有2个备份</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-300 rounded border"></div>
                <span className="text-muted-foreground">有3+个备份</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded border"></div>
                <span className="text-muted-foreground">已选中</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-200 rounded border-2 border-purple-500"></div>
                <span className="text-muted-foreground">今天</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据加载状态 */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">正在加载历史数据...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 显示选中日期的数据 */}
      {!loading && selectedDate && selectedDateInfo && repositories.length > 0 && (
        <>
          {/* 日期信息卡片 */}
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500 text-white">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <span>{selectedDateInfo.displayDate} 的每日趋势</span>
                      <Badge variant="secondary">
                        {repositories.length} 个项目
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>数据采集时间: {selectedDateInfo.displayTime}</span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    网格
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    列表
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* 统计面板 */}
          <TrendingStatsPanel
            repositories={repositories}
            period="daily"
            className="mb-6"
          />

          {/* 项目列表 */}
          <Card>
            <CardContent className="pt-6">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {repositories.map((repo, index) => (
                    <div
                      key={repo.id || index}
                      className="transition-all duration-200 hover:scale-105"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <EnhancedRepositoryCard
                        repository={repo}
                        periodLabel="当日新增"
                        showDetailedStats={true}
                        showTrendIndicator={true}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {repositories.map((repo, index) => (
                    <div
                      key={repo.id || index}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <a
                              href={repo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-lg font-semibold hover:text-blue-600 hover:underline"
                            >
                              {repo.fullName}
                            </a>
                            {repo.language && (
                              <Badge variant="secondary">{repo.language}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {repo.description || '暂无描述'}
                          </p>
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <span>⭐</span>
                              <span>{repo.stars.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>🔱</span>
                              <span>{repo.forks.toLocaleString()}</span>
                            </div>
                            {repo.todayStars > 0 && (
                              <div className="flex items-center space-x-1 text-green-600">
                                <TrendingUp className="w-3 h-3" />
                                <span>+{repo.todayStars} 当日</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 选择提示 */}
      {!loading && !selectedDate && availableDates.length > 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">请点击日历上有标记的日期</p>
              <p className="text-sm mt-2">绿色标记表示该日期有历史趋势数据</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空数据状态 */}
      {!loadingDates && availableDates.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">暂无历史数据</p>
              <p className="text-sm mt-2">请在"每日趋势"、"每周趋势"或"每月趋势"标签页中点击"更新数据"按钮</p>
              <p className="text-sm">系统会自动为每次更新创建历史备份</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
