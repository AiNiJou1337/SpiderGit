'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// 使用自定义样式的卡片组件
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Download } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Info } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Info } from "lucide-react"

interface Chart {
  filename: string
  type: string
  url: string
}

interface ChartsDisplayProps {
  keyword: string
  onRefresh?: () => void
  isLoading?: boolean
}

interface TabState {
  activeTab: string
  setActiveTab: (tab: string) => void
}

interface LibraryStats {
  [key: string]: number
}

interface LibraryData {
  all: LibraryStats
  by_language: {
    [language: string]: LibraryStats
  }
}

export function ChartsDisplay({ keyword, onRefresh, isLoading = false }: ChartsDisplayProps) {
  const [charts, setCharts] = useState<Chart[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [data, setData] = useState<LibraryData | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [languages, setLanguages] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('daily')

  const fetchCharts = async () => {
    if (!keyword) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/charts?keyword=${encodeURIComponent(keyword)}`)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
        setCharts([])
      } else {
        setCharts(data.charts || [])
      }
    } catch (err) {
      setError('获取图表失败，请稍后重试')
      setCharts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/charts')
        
        if (!response.ok) {
          throw new Error('数据获取失败')
        }
        
        const jsonData = await response.json()
        setData(jsonData)
        
        // 提取语言列表
        const languageList = Object.keys(jsonData.by_language || {})
        setLanguages(languageList)
        
      } catch (err) {
        console.error('获取图表数据失败:', err)
        setError('无法加载库使用统计数据。可能需要先运行分析脚本生成数据。')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // 获取漂亮的图表名称
  const getPrettyChartName = (chartType: string) => {
    switch (chartType) {
      case 'language_pie':
        return '编程语言分布'
      case 'stars_bar':
        return '星标分布'
      case 'tags_wordcloud':
        return '标签词云'
      default:
        return chartType.replace('_', ' ')
    }
  }

  // 下载图表
  const downloadChart = (chart: Chart) => {
    const link = document.createElement('a')
    link.href = chart.url
    link.download = chart.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 格式化数据为recharts所需格式
  const formatChartData = (stats: LibraryStats | undefined) => {
    if (!stats) return []
    
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({
        name,
        count
      }))
  }

  // 根据选择的语言获取数据
  const getDisplayData = () => {
    if (!data) return []
    
    if (selectedLanguage === 'all') {
      return formatChartData(data.all)
    }
    
    return formatChartData(data.by_language[selectedLanguage])
  }

  if (loading) {
    return (
      <Card className="chart-card">
        <CardHeader>
          <CardTitle>库使用统计</CardTitle>
          <CardDescription>加载中...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-[20px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>获取数据失败</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {keyword} 的可视化图表
            <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200" variant="outline">
              {charts.length} 个图表
            </Badge>
          </h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onRefresh ? onRefresh() : fetchCharts()}
            disabled={loading || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || isLoading) ? 'animate-spin' : ''}`} />
            刷新图表
          </Button>
        </div>
        <div className="flex space-x-4 border-b pb-2">
          <Button
            variant={activeTab === 'daily' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('daily')}
            className="text-sm font-medium"
          >
            每日趋势
          </Button>
          <Button
            variant={activeTab === 'weekly' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('weekly')}
            className="text-sm font-medium"
          >
            每周趋势
          </Button>
          <Button
            variant={activeTab === 'monthly' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('monthly')}
            className="text-sm font-medium"
          >
            每月趋势
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {(loading || isLoading) && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          <p className="mt-2 text-gray-500">加载图表中...</p>
        </div>
      )}
      
      {!loading && !isLoading && charts.length === 0 && !error && (
        <div className="text-center py-8 rounded-lg">
          <p className="text-gray-500">没有找到图表数据</p>
          <p className="text-sm text-gray-400 mt-1">请确保已为此关键词生成分析图表</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <div key={chart.filename} className="chart-card">
            <div className="pb-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">{getPrettyChartName(chart.type)}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => downloadChart(chart)} 
                  title="下载图表"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-0">
              <div className="relative aspect-video w-full h-52 flex items-center justify-center">
                <img
                  src={chart.url}
                  alt={`${keyword} ${chart.type} 图表`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <div>
          <div className="text-lg font-semibold">库使用统计</div>
          <div className="text-sm text-gray-500">GitHub仓库中最常用的开发库</div>
        </div>
        <div>
          <div className="mb-4 flex items-center space-x-4">
            <div className="text-sm font-medium">选择语言:</div>
            <Select
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择语言" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有语言</SelectItem>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="mt-6 h-[400px]">
            {getDisplayData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getDisplayData()}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    width={100}
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value} 
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} 次使用`, '频率']}
                    labelFormatter={(name) => `库: ${name}`}
                  />
                  <Bar dataKey="count" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>暂无数据</AlertTitle>
                  <AlertDescription>
                    未找到该语言的库使用数据，请选择其他语言或运行分析脚本。
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}