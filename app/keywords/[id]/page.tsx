'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChartComponent, BarChartComponent } from '@/components/ui/charts'

interface Keyword {
  id: string
  name: string
  count: number
  trend: 'up' | 'down' | 'stable'
  repositories: {
    id: string
    name: string
    description: string
    stars: number
    language: string
  }[]
}

interface TrendData {
  date: string
  count: number
}

interface LanguageData {
  name: string
  count: number
}

export default function KeywordDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState<Keyword | null>(null)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [languageData, setLanguageData] = useState<LanguageData[]>([])
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取关键词详情
        const keywordResponse = await fetch(`/api/keywords/${params.id}`)
        const keywordData = await keywordResponse.json()
        setKeyword(keywordData.keyword)
        
        // 获取趋势数据
        const trendResponse = await fetch(`/api/keywords/${params.id}/trend`)
        const trendData = await trendResponse.json()
        if (trendData.trend) {
          setTrendData(
            trendData.trend.map((item: any) => ({
              date: item.date,
              count: Number(item.count)
            }))
          )
        }
        
        // 获取语言分布数据
        const languageResponse = await fetch(`/api/keywords/${params.id}/languages`)
        const languageData = await languageResponse.json()
        if (languageData.languages) {
          setLanguageData(
            Object.entries(languageData.languages)
              .map(([name, count]) => ({ 
                name, 
                count: Number(count) 
              }))
              .sort((a, b) => b.count - a.count)
          )
        }
      } catch (error) {
        console.error('加载数据失败:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [params.id])
  
  // 获取趋势图标
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    } else {
      return <Minus className="h-4 w-4 text-gray-500" />
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }
  
  if (!keyword) {
    return (
      <div className="container mx-auto py-6">
        <p>关键词不存在</p>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/keywords">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{keyword.name}</h1>
      </div>
      
      {/* 关键词信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{keyword.name}</CardTitle>
              <CardDescription>出现次数: {keyword.count}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(keyword.trend)}
              <span className="text-sm text-muted-foreground">
                {keyword.trend === 'up' ? '上升趋势' : 
                 keyword.trend === 'down' ? '下降趋势' : '稳定'}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* 分析图表 */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <LineChartComponent
          data={trendData}
          title="趋势变化"
          description="过去30天的使用频率变化"
          height={400}
        />
        
        <BarChartComponent
          data={languageData}
          title="语言分布"
          description="使用该关键词的项目语言分布"
          xAxisKey="name"
          yAxisKey="count"
          layout="vertical"
          height={400}
        />
      </div>
      
      {/* 相关仓库列表 */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {keyword.repositories.map((repo) => (
          <Card key={repo.id}>
            <CardHeader>
              <CardTitle className="text-lg">{repo.name}</CardTitle>
              <CardDescription>{repo.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {repo.language}
                </span>
                <span className="text-sm font-medium">
                  {repo.stars} stars
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link href={`/repositories/${repo.id}`}>
                  查看详情
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
} 