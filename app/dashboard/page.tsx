'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Github, Code, GitFork, Star, Zap, FileCode, CheckCircle, Clock } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { LanguageTrendsChart } from '@/components/language-trends-chart'

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
        languageCount[repo.language] = (languageCount[repo.language] || 0) + 1
      }
    })
    
    return Object.entries(languageCount)
      .map(([name, count]) => ({
        name,
        value: count,
        color: getLanguageColor(name)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }
  
  // 获取语言颜色
  function getLanguageColor(language: string): string {
    return languageColors[language] || '#8884d8'
  }

  // 页面加载时获取数据
  useEffect(() => {
    fetchStats()
  }, [])
  
  // 刷新数据
  const handleRefresh = () => {
    fetchStats()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">GitHub 趋势分析仪表盘</h1>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总项目数</CardTitle>
            <Github className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRepositories.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">跟踪的GitHub仓库总数</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-gradient-to-br from-yellow-500/10 to-amber-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">星标总数</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStars.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">所有仓库的星标总数</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-gradient-to-br from-green-500/10 to-emerald-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fork总数</CardTitle>
            <GitFork className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalForks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">所有仓库的Fork总数</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">关键词数</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKeywords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">跟踪的技术关键词总数</p>
          </CardContent>
        </Card>
      </div>
      
      {/* 爬虫状态 */}
      <Card className="glass-card bg-gradient-to-br from-teal-500/10 to-cyan-500/10">
        <CardHeader>
          <CardTitle className="text-lg font-medium">爬虫任务状态</CardTitle>
          <CardDescription>
            数据爬取任务的完成情况
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between mb-2">
            <div>已完成任务</div>
            <div className="font-medium">{stats.completedCrawls}</div>
          </div>
          <Progress value={stats.completedCrawls / (stats.completedCrawls + stats.pendingCrawls) * 100} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <div>进行中: {stats.pendingCrawls}</div>
            <div>总计: {stats.completedCrawls + stats.pendingCrawls}</div>
          </div>
        </CardContent>
      </Card>
      
      {/* 语言分布 */}
      <Card className="glass-card bg-gradient-to-br from-indigo-500/10 to-blue-500/10">
        <CardHeader>
          <CardTitle className="text-lg font-medium">语言分布</CardTitle>
          <CardDescription>
            按仓库数量的编程语言分布
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.languageDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(2)}%`}
                >
                  {stats.languageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} 个仓库`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* 语言趋势分析 */}
      <LanguageTrendsChart />
      
      {/* 热门仓库 */}
      <Card className="glass-card bg-gradient-to-br from-orange-500/10 to-red-500/10">
        <CardHeader>
          <CardTitle className="text-lg font-medium">热门仓库</CardTitle>
          <CardDescription>
            按星标数排名的热门项目
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentRepositories.map((repo, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg glass-effect bg-gradient-to-r from-gray-500/5 to-gray-700/5">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Github className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{repo.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span 
                            className="w-2 h-2 rounded-full inline-block" 
                            style={{ backgroundColor: getLanguageColor(repo.language) }}
                          />
                          {repo.language}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>{repo.stars.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 