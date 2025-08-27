'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'

interface TrendingCalendarProps {
  className?: string
}

interface DayData {
  date: string
  count: number
  trend: 'up' | 'down' | 'stable'
  topLanguages: string[]
  topProjects: Array<{
    name: string
    stars: number
    growth: number
  }>
}

interface CalendarData {
  [key: string]: DayData
}

export function TrendingCalendar({ className }: TrendingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<CalendarData>({})
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
  const [loading, setLoading] = useState(false)

  // 获取日历数据
  const fetchCalendarData = async (year: number, month: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/trending/calendar?year=${year}&month=${month + 1}`)
      if (response.ok) {
        const data = await response.json()
        setCalendarData(data.calendar || {})
      }
    } catch (error) {
      console.error('获取日历数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalendarData(currentDate.getFullYear(), currentDate.getMonth())
  }, [currentDate])

  // 获取月份的天数和起始日期
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  // 导航到上个月
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  // 导航到下个月
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // 格式化日期为字符串
  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // 获取趋势图标
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-500" />
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-500" />
      default:
        return <Minus className="w-3 h-3 text-gray-400" />
    }
  }

  // 获取热度颜色
  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-gray-100'
    if (count < 20) return 'bg-green-100'
    if (count < 50) return 'bg-green-200'
    if (count < 80) return 'bg-green-300'
    return 'bg-green-400'
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ]
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>趋势日历</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-lg font-medium min-w-[120px] text-center">
                {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
              </span>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {/* 空白天数 */}
            {Array.from({ length: startingDayOfWeek }, (_, i) => (
              <div key={`empty-${i}`} className="h-12" />
            ))}
            
            {/* 月份天数 */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day)
              const dayData = calendarData[dateKey]
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString()
              
              return (
                <TooltipProvider key={day}>
                  <Tooltip
                    content={
                      <div className="text-sm">
                        <div className="font-medium">{dateKey}</div>
                        {dayData ? (
                          <>
                            <div>项目数: {dayData.count}</div>
                            <div>趋势: {dayData.trend === 'up' ? '上升' : dayData.trend === 'down' ? '下降' : '稳定'}</div>
                            {dayData.topLanguages.length > 0 && (
                              <div>热门语言: {dayData.topLanguages.slice(0, 3).join(', ')}</div>
                            )}
                          </>
                        ) : (
                          <div>暂无数据</div>
                        )}
                      </div>
                    }
                  >
                    <div
                      className={`
                        h-12 p-1 rounded cursor-pointer transition-all duration-200 hover:scale-105
                        ${getHeatColor(dayData?.count || 0)}
                        ${isToday ? 'ring-2 ring-blue-500' : ''}
                        ${selectedDay?.date === dateKey ? 'ring-2 ring-purple-500' : ''}
                      `}
                      onClick={() => setSelectedDay(dayData || null)}
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-xs font-medium">{day}</span>
                        {dayData && (
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(dayData.trend)}
                            <span className="text-xs">{dayData.count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
          
          {/* 热度图例 */}
          <div className="flex items-center justify-center space-x-2 mt-4 text-xs text-gray-500">
            <span>少</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gray-100 rounded"></div>
              <div className="w-3 h-3 bg-green-100 rounded"></div>
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <div className="w-3 h-3 bg-green-300 rounded"></div>
              <div className="w-3 h-3 bg-green-400 rounded"></div>
            </div>
            <span>多</span>
          </div>
        </CardContent>
      </Card>

      {/* 选中日期的详细信息 */}
      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDay.date} 详细信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">基本信息</h4>
                <div className="space-y-1 text-sm">
                  <div>项目总数: {selectedDay.count}</div>
                  <div className="flex items-center space-x-2">
                    <span>趋势:</span>
                    {getTrendIcon(selectedDay.trend)}
                    <span>{selectedDay.trend === 'up' ? '上升' : selectedDay.trend === 'down' ? '下降' : '稳定'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">热门语言</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedDay.topLanguages.map(lang => (
                    <Badge key={lang} variant="secondary" className="text-xs">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {selectedDay.topProjects.length > 0 && (
                <div className="md:col-span-2">
                  <h4 className="font-medium mb-2">热门项目</h4>
                  <div className="space-y-2">
                    {selectedDay.topProjects.slice(0, 5).map(project => (
                      <div key={project.name} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{project.name}</span>
                        <div className="flex items-center space-x-2">
                          <span>{project.stars} stars</span>
                          <span className={`text-xs ${project.growth > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                            +{project.growth}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
