'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download, AlertCircle, Info } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Chart {
  filename: string
  type: string
  url: string
}

interface ChartsDisplayProps {
  className?: string
}

export default function ChartsDisplay({ className }: ChartsDisplayProps) {
  const [charts, setCharts] = useState<Chart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string>('all')

  useEffect(() => {
    loadCharts()
  }, [])

  const loadCharts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 模拟加载图表数据
      const mockCharts: Chart[] = [
        {
          filename: 'language_trends.png',
          type: 'trend',
          url: '/analytics/charts/language_trends.png'
        },
        {
          filename: 'library_usage.png', 
          type: 'library',
          url: '/analytics/charts/library_usage.png'
        },
        {
          filename: 'keyword_analysis.png',
          type: 'keyword',
          url: '/analytics/charts/keyword_analysis.png'
        },
        {
          filename: 'repository_stats.png',
          type: 'stats',
          url: '/analytics/charts/repository_stats.png'
        }
      ]
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setCharts(mockCharts)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载图表失败')
    } finally {
      setLoading(false)
    }
  }

  const filteredCharts = selectedType === 'all' 
    ? charts 
    : charts.filter(chart => chart.type === selectedType)

  const chartTypes = [
    { value: 'all', label: '所有图表' },
    { value: 'trend', label: '趋势图表' },
    { value: 'library', label: '库分析' },
    { value: 'keyword', label: '关键词分析' },
    { value: 'stats', label: '统计图表' }
  ]

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>图表展示</CardTitle>
          <CardDescription>正在加载分析图表...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-48 w-full" />
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
          <CardTitle>图表展示</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={loadCharts}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>图表展示</CardTitle>
            <CardDescription>
              数据分析可视化图表 ({filteredCharts.length} 个图表)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                {chartTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadCharts}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredCharts.length === 0 ? (
          <div className="border rounded-lg p-6 text-center text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-1">暂无图表</h3>
            <p className="text-sm">
              当前筛选条件下没有找到图表，请尝试其他筛选条件或刷新数据。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCharts.map((chart, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{chart.filename}</h3>
                    <Badge variant="secondary">{chart.type}</Badge>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                  <img
                    src={chart.url}
                    alt={chart.filename}
                    className="w-full h-auto"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder-chart.png'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {filteredCharts.length > 0 && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              下载所有图表
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
