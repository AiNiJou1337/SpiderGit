'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Github, Code, GitFork, Star, Zap, FileCode, CheckCircle, Clock } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

// 定义仓库接口
interface Repository {
  id?: number
  name: string
  owner: string
  fullName?: string
  description?: string
  language?: string
  stars: number
  forks?: number
  todayStars?: number
  url?: string
  trendDate?: string
  trendPeriod?: string
  trending?: boolean
}

// 定义爬虫任务接口
interface CrawlTask {
  completedTasks: number
  pendingTasks: number
}

// 定义统计数据接口
interface Stats {
  totalRepositories: number
  totalStars: number
  totalForks: number
  totalKeywords: number
  completedCrawls: number
  pendingCrawls: number
  topLanguages: {
    name: string
    count: number
    color: string
  }[]
  recentRepositories: {
    name: string
    stars: number
    language: string
  }[]
  trendData: {
    date: string
    [key: string]: string | number
  }[]
  languageDistribution: {
    name: string
    value: number
    color: string
  }[]
}

// 语言颜色映射
const languageColors: {[key: string]: string} = {
  'JavaScript': '#f1e05a',
  'Python': '#3572A5',
  'TypeScript': '#2b7489',
  'Java': '#b07219',
  'Go': '#00ADD8',
  'C++': '#f34b7d',
  'Dart': '#00B4AB'
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalRepositories: 0,
    totalStars: 0,
    totalForks: 0,
    totalKeywords: 0,
    completedCrawls: 0,
    pendingCrawls: 0,
    topLanguages: [],
    recentRepositories: [],
    trendData: [],
    languageDistribution: []
  })

  // 加载统计数据
  const fetchStats = async () => {
    setLoading(true)
    try {
      // 获取基础统计数据
      const statsResponse = await fetch('/api/stats')
      const statsData = await statsResponse.json()
      
      // 获取关键词总数
      const keywordsResponse = await fetch('/api/keywords')
      const keywordsData = await keywordsResponse.json()
      
      // 获取爬虫任务状态
      let completedCrawls = 0;
      let pendingCrawls = 0;
      
      try {
        // 获取所有爬虫任务的统计数据
        const crawlTasksResponse = await fetch('/api/crawl/stats')
        const crawlTasksData = await crawlTasksResponse.json()
        
        completedCrawls = crawlTasksData?.completedTasks || 0;
        pendingCrawls = crawlTasksData?.pendingTasks || 0;
      } catch (error) {
        console.error('获取爬虫任务统计失败:', error)
        // 使用默认值
      }
      
      // 获取月度趋势仓库数据
      const trendingResponse = await fetch('/api/trending?period=monthly')
      const trendingData = await trendingResponse.json()
      
      // 获取语言分布数据
      const languageDistribution = getLanguageDistribution(trendingData.repositories)
      
      // 获取热门仓库
      const reposResponse = await fetch('/api/repositories?limit=5&sort=stars&order=desc')
      const reposData = await reposResponse.json()
      
      // 处理月度趋势数据，按日期分组
      const trendDataByDate: {[date: string]: {[language: string]: number}} = {}
      
      // 为确保有足够的数据点，创建过去30天的日期数组
      const last30Days: string[] = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
        last30Days.push(dateStr)
        trendDataByDate[dateStr] = {} // 初始化每天的数据
      }
      
      // 按语言分组，找出前5种最流行的语言
      const topLanguages: {[key: string]: number} = {}
      trendingData.repositories.forEach((repo: Repository) => {
        if (repo.language) {
          topLanguages[repo.language] = (topLanguages[repo.language] || 0) + (repo.stars || 0)
        }
      })
      
      // 获取前5种最流行的语言
      const top5Languages = Object.entries(topLanguages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([language]) => language)
      
      console.log('Top 5 Languages:', top5Languages);
      
      // 初始化每种语言每天的数据为0
      last30Days.forEach(date => {
        top5Languages.forEach(language => {
          trendDataByDate[date][language] = 0
        })
      })
      
      // 填充实际数据
      trendingData.repositories.forEach((repo: Repository) => {
        if (!repo.language || !repo.trendDate) return
        
        // 只处理前5种语言的数据
        if (!top5Languages.includes(repo.language)) return
        
        try {
          const date = new Date(repo.trendDate)
          if (isNaN(date.getTime())) return // 跳过无效日期
          
          const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
          if (trendDataByDate[dateStr]) {
            // 使用星标数而不是今日星标数，确保有数据
            trendDataByDate[dateStr][repo.language] += repo.stars || 0
          }
        } catch (e) {
          console.error('处理日期出错:', e)
        }
      })
      
      // 转换为图表所需格式
      const trendData = last30Days.map(date => ({
        date,
        ...trendDataByDate[date]
      }))
      
      // 打印处理后的数据，用于调试
      console.log('Trend Data Sample:', trendData.slice(0, 3));
      
      // 更新状态
      setStats({
        totalRepositories: statsData.totalRepositories || 0,
        totalStars: statsData.totalStars || 0,
        totalForks: statsData.totalForks || 0,
        totalKeywords: keywordsData.total || 0,
        completedCrawls: completedCrawls,
        pendingCrawls: pendingCrawls,
        topLanguages: top5Languages.map(name => ({
          name,
          count: topLanguages[name],
          color: languageColors[name] || '#8884d8'
        })),
        recentRepositories: reposData.repositories.map((repo: Repository) => ({
          name: `${repo.owner}/${repo.name}`,
          stars: repo.stars,
          language: repo.language || 'Unknown'
        })),
        trendData,
        languageDistribution
      })
      
      setLoading(false)
    } catch (error) {
      console.error('加载统计数据失败:', error)
      setLoading(false)
    }
  }

  // 获取热门语言数据
  const getTopLanguages = (repositories: Repository[]) => {
    const languageCount: {[key: string]: number} = {}
    
    repositories.forEach(repo => {
      if (repo.language) {
        if (!languageCount[repo.language]) {
          languageCount[repo.language] = 0
        }
        languageCount[repo.language]++
      }
    })
    
    return Object.keys(languageCount)
      .map(name => ({
        name,
        count: languageCount[name],
        color: languageColors[name] || '#8884d8'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }
  
  // 获取语言分布数据
  const getLanguageDistribution = (repositories: Repository[]) => {
    const languageCount: {[key: string]: number} = {}
    
    repositories.forEach(repo => {
      if (repo.language) {
        if (!languageCount[repo.language]) {
          languageCount[repo.language] = 0
        }
        languageCount[repo.language]++
      }
    })
    
    // 计算百分比
    const total = Object.values(languageCount).reduce((sum: number, count: number) => sum + count, 0)
    
    return Object.keys(languageCount)
      .map(name => ({
        name,
        value: Math.round((languageCount[name] / total) * 100),
        color: languageColors[name] || '#8884d8'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // 颜色配置
  const RADIAN = Math.PI / 180
  
  // 计算爬虫完成百分比
  const crawlPercentage = stats.completedCrawls + stats.pendingCrawls > 0 
    ? (stats.completedCrawls / (stats.completedCrawls + stats.pendingCrawls) * 100) 
    : 0

  return (
    <div className="container mx-auto py-4 px-4 md:px-6">
      <div className="flex flex-col gap-2 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">GitHub趋势爬虫仪表盘</h1>
        <p className="text-muted-foreground">查看GitHub仓库数据分析和趋势</p>
      </div>
      
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总项目数</CardTitle>
            <Github className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRepositories.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">抓取的GitHub仓库总数</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总星标数</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStars.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">所有项目的累计星标</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总Fork数</CardTitle>
            <GitFork className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalForks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">所有项目的累计分支</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">关键词</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKeywords}</div>
            <p className="text-xs text-muted-foreground">跟踪的关键词数量</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* 爬虫状态卡片 */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-medium">爬虫状态</CardTitle>
            <CardDescription>当前爬虫任务完成情况</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>完成率</span>
                <span>{Math.round(crawlPercentage)}%</span>
              </div>
              <Progress value={crawlPercentage} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">已完成</span>
                <span className="text-xl font-bold">{stats.completedCrawls}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">待处理</span>
                <span className="text-xl font-bold">{stats.pendingCrawls}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新数据
            </Button>
          </CardContent>
        </Card>

        {/* 语言分布图表 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-medium">语言分布</CardTitle>
            <CardDescription>按编程语言统计的仓库数量</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                  <Pie
                    data={stats.languageDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.languageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, name]} 
                    labelFormatter={() => '占比'} 
                  />
                  <Legend 
                    formatter={(value, entry) => (
                      <span style={{ color: entry.color }}>
                        {value}: {(entry.payload as any)?.value || 0}%
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表标签页 */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trends">月度趋势</TabsTrigger>
          <TabsTrigger value="top">热门语言</TabsTrigger>
        </TabsList>
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">热门框架趋势</CardTitle>
              <CardDescription>过去一个月流行框架的星标变化</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stats.trendData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => value.split('/')[1] || value}
                      interval={4} // 只显示部分日期，避免拥挤
                    />
                    <YAxis 
                      width={50}
                      tickFormatter={(value) => value > 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                    />
                    <Tooltip 
                      formatter={(value, name) => [value, name]} 
                      labelFormatter={(label) => `日期: ${label}`}
                    />
                    <Legend verticalAlign="top" height={36} />
                    {stats.topLanguages.map((language) => (
                      <Line
                        key={language.name}
                        type="monotone"
                        name={language.name}
                        dataKey={language.name}
                        stroke={language.color}
                        activeDot={{ r: 6 }}
                        strokeWidth={2}
                        dot={false} // 不显示每个数据点的圆点，使图表更清爽
                        connectNulls={true} // 连接空值点
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="top">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">热门编程语言</CardTitle>
              <CardDescription>按仓库数量排名的编程语言</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.topLanguages}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="仓库数量">
                      {stats.topLanguages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 最新仓库列表 */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg font-medium">最新热门仓库</CardTitle>
          <CardDescription>按星标数排序的最新抓取仓库</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentRepositories.map((repo, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="flex items-center">
                  <Github className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{repo.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getLanguageColor(repo.language) }}></div>
                    <span className="text-sm text-muted-foreground">{repo.language}</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 mr-1 text-muted-foreground" />
                    <span className="text-sm">{repo.stars.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 获取语言颜色的辅助函数
function getLanguageColor(language: string): string {
  return languageColors[language] || '#8884d8'
}