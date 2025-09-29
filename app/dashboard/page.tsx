'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, Github, Code, GitFork, Star, Zap, FileCode, CheckCircle, Clock, Download,
  TrendingUp, Activity, Users, Calendar, BarChart3, LineChart as LineChartIcon,
  ArrowUpRight, ArrowDownRight, Minus, Eye, ExternalLink, Filter, Search
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingHotRepositories } from '@/src/components/features/trending-hot-repositories'
import { TechStatsOverview } from '@/src/components/features/tech-stats-overview'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  failedTasks?: number
  recentTasks?: {
    id: number
    keyword: string
    status: string
    progress: number
    startedAt: string
    completedAt?: string
  }[]
}

// 单个任务详情接口
interface TaskDetail {
  id: number
  keyword: string
  status: string
  progress: number
  message?: string
  startedAt: string
  completedAt?: string
  totalRepositories: number
}

// 统计数据接口
interface Stats {
  totalRepositories: number
  totalStars: number
  totalForks: number
  totalKeywords: number
  completedCrawls: number
  pendingCrawls: number
  failedCrawls: number
  topLanguages: { language: string; count: number }[]
  recentRepositories: Repository[]
  trendData: { date: string; [key: string]: any }[]
  languageDistribution: { name: string; value: number; color: string }[]
  recentTasks: {
    id: number
    keyword: string
    status: string
    progress: number
    startedAt: string
    completedAt?: string
  }[]
}

// 语言颜色映射
const LANGUAGE_COLORS: { [key: string]: string } = {
  'JavaScript': '#f1e05a',
  'TypeScript': '#2b7489',
  'Python': '#3572A5',
  'Java': '#b07219',
  'Go': '#00ADD8',
  'C++': '#f34b7d',
  'Dart': '#00B4AB'
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [showTasks, setShowTasks] = useState(false)
  const [tasksList, setTasksList] = useState<TaskDetail[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalRepositories: 0,
    totalStars: 0,
    totalForks: 0,
    totalKeywords: 0,
    completedCrawls: 0,
    pendingCrawls: 0,
    failedCrawls: 0,
    topLanguages: [],
    recentRepositories: [],
    trendData: [],
    languageDistribution: [],
    recentTasks: []
  })
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
  const [exportLoading, setExportLoading] = useState<string | null>(null)

  // 获取语言分布数据
  const getLanguageDistribution = (repositories: Repository[]) => {
    const languageCount: { [key: string]: number } = {}
    
    repositories.forEach(repo => {
      if (repo.language) {
        languageCount[repo.language] = (languageCount[repo.language] || 0) + 1
      }
    })
    
    return Object.entries(languageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([language, count]) => ({
        name: language,
        value: count,
        color: LANGUAGE_COLORS[language] || '#8884d8'
      }))
  }

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
      let completedCrawls = 0
      let pendingCrawls = 0
      let failedCrawls = 0
      let recentTasks = []
      
      try {
        // 获取所有爬虫任务的统计数据
        const crawlTasksResponse = await fetch('/api/crawl/stats')
        const crawlTasksData = await crawlTasksResponse.json()
        
        completedCrawls = crawlTasksData?.completedTasks || 0
        pendingCrawls = crawlTasksData?.pendingTasks || 0
        failedCrawls = crawlTasksData?.failedTasks || 0
        recentTasks = crawlTasksData?.recentTasks || []
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
      
      console.log('Top 5 Languages:', top5Languages)
      
      // 初始化每种语言每天的数据为0
      last30Days.forEach(date => {
        if (trendDataByDate[date]) {
          top5Languages.forEach(language => {
            if (trendDataByDate[date]) {
              trendDataByDate[date][language] = 0
            }
          })
        }
      })
      
      // 填充实际数据
      trendingData.repositories.forEach((repo: Repository) => {
        if (repo.language && top5Languages.includes(repo.language) && repo.trendDate) {
          const repoDate = new Date(repo.trendDate)
          const dateStr = repoDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
          
          if (trendDataByDate[dateStr]) {
            trendDataByDate[dateStr][repo.language] = (trendDataByDate[dateStr][repo.language] || 0) + 1
          }
        }
      })
      
      // 转换为图表数据格式
      const trendData = last30Days.map(date => ({
        date,
        ...trendDataByDate[date]
      }))
      
      console.log('Trend Data Sample:', trendData.slice(0, 3))
      
      setStats({
        totalRepositories: statsData.totalRepositories || 0,
        totalStars: statsData.totalStars || 0,
        totalForks: statsData.totalForks || 0,
        totalKeywords: keywordsData.keywords?.length || 0,
        completedCrawls,
        pendingCrawls,
        failedCrawls,
        topLanguages: Object.entries(topLanguages)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([language, count]) => ({ language, count })),
        recentRepositories: reposData.repositories || [],
        trendData,
        languageDistribution,
        recentTasks
      })
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取任务列表
  const fetchTasksList = async () => {
    setTasksLoading(true)
    try {
      const response = await fetch('/api/crawl/list?limit=50')
      const data = await response.json()

      if (data.tasks) {
        setTasksList(data.tasks || [])
      } else {
        console.error('获取任务列表失败:', data.error)
      }
    } catch (error) {
      console.error('获取任务列表失败:', error)
    } finally {
      setTasksLoading(false)
    }
  }

  // 切换显示任务列表
  const toggleTasksList = () => {
    const newShowTasks = !showTasks
    setShowTasks(newShowTasks)
    
    if (newShowTasks && tasksList.length === 0) {
      fetchTasksList()
    }
  }

  // 删除爬虫任务
  const deleteTask = async (taskId: number) => {
    if (window.confirm('确定要删除这个任务记录吗？')) {
      setDeleteLoading(taskId)
      try {
        const response = await fetch(`/api/analysis/${taskId}`, {
          method: 'DELETE'
        })

        const data = await response.json()

        if (data.success) {
          // 从列表中移除已删除的任务
          setTasksList((prev: TaskDetail[]) => prev.filter((task: TaskDetail) => task.id !== taskId))
          alert('任务删除成功')
        } else {
          alert('删除失败: ' + (data.error || '未知错误'))
        }
      } catch (error) {
        console.error('删除任务失败:', error)
        alert('删除任务失败，请稍后重试')
      } finally {
        setDeleteLoading(null)
      }
    }
  }

  // 导出数据为CSV
  const exportData = async (type: string) => {
    setExportLoading(type)
    try {
      const response = await fetch(`/api/export/${type}`)

      if (!response.ok) {
        throw new Error('导出请求失败')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // 根据类型设置文件名
      const fileNames = {
        'tasks': 'crawl_tasks.csv',
        'repositories': 'repositories.csv',
        'keywords': 'keywords.csv'
      }

      link.download = fileNames[type as keyof typeof fileNames] || 'export.csv'

      // 安全地添加到DOM
      document.body.appendChild(link)

      // 触发点击
      link.click()

      // 使用setTimeout延迟移除，确保下载开始
      setTimeout(() => {
        try {
          // 检查元素是否仍然在DOM中
          if (link.parentNode === document.body) {
            document.body.removeChild(link)
          }
        } catch (error) {
          console.warn('移除下载链接时出错:', error)
          // 忽略错误，不影响功能
        }
      }, 100)

    } catch (error) {
      console.error('导出数据失败:', error)
      alert('导出数据失败，请稍后重试')
    } finally {
      setExportLoading(null)
    }
  }

  // 格式化数字
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) {
      return '0'
    }
    
    const numValue = Number(num)
    
    if (numValue >= 1000000) {
      return (numValue / 1000000).toFixed(1) + 'M'
    } else if (numValue >= 1000) {
      return (numValue / 1000).toFixed(1) + 'K'
    }
    return numValue.toString()
  }

  // 自定义 Tooltip 渲染函数（参考其他模块的成功实现）
  const renderCustomTooltip = (props: any) => {
    if (props.active && props.payload && props.payload.length) {
      const data = props.payload[0]
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            数量: {data.value}
          </p>
        </div>
      )
    }
    return null
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
    <div className="container mx-auto py-6 space-y-6 relative z-10">
      <div className="space-y-8">
        {/* 现代化头部 */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              GitHub 数据仪表盘
            </h1>
            <p className="text-muted-foreground text-lg">
              实时监控开源项目动态，洞察技术发展趋势
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 快速筛选 */}
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="时间范围" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部时间</SelectItem>
                <SelectItem value="today">今日</SelectItem>
                <SelectItem value="week">本周</SelectItem>
                <SelectItem value="month">本月</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shadow-sm" disabled={!!exportLoading}>
                  {exportLoading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  导出数据
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportData('tasks')}>
                  爬虫任务数据
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportData('repositories')}>
                  仓库数据
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportData('keywords')}>
                  关键词数据
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={handleRefresh} variant="outline" className="shadow-sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* 现代化统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-indigo-500/10 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-50"></div>
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">总项目数</CardTitle>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Github className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {stats.totalRepositories.toLocaleString()}
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <p className="text-sm text-muted-foreground">跟踪的GitHub仓库</p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-amber-500/10 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-transparent opacity-50"></div>
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-300">星标总数</CardTitle>
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                {stats.totalStars.toLocaleString()}
              </div>
              <div className="flex items-center mt-2">
                <Activity className="h-4 w-4 text-yellow-500 mr-1" />
                <p className="text-sm text-muted-foreground">社区认可度</p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-500/10 via-green-500/5 to-emerald-500/10 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent opacity-50"></div>
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Fork总数</CardTitle>
              <div className="p-2 bg-green-500/20 rounded-lg">
                <GitFork className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                {stats.totalForks.toLocaleString()}
              </div>
              <div className="flex items-center mt-2">
                <Users className="h-4 w-4 text-green-500 mr-1" />
                <p className="text-sm text-muted-foreground">开发者参与度</p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-pink-500/10 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-50"></div>
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">关键词数</CardTitle>
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {stats.totalKeywords.toLocaleString()}
              </div>
              <div className="flex items-center mt-2">
                <Search className="h-4 w-4 text-purple-500 mr-1" />
                <p className="text-sm text-muted-foreground">技术关键词</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 现代化爬虫状态面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 任务状态概览 */}
          <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-cyan-500/10 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-semibold text-teal-700 dark:text-teal-300">
                    爬虫任务状态
                  </CardTitle>
                  <CardDescription className="text-base">
                    实时监控数据采集进度
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTasksList}
                    className="shadow-sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showTasks ? '收起' : '详情'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 任务统计 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.completedCrawls}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 mt-1">已完成</div>
                </div>
                <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.pendingCrawls}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">进行中</div>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.failedCrawls}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 mt-1">失败</div>
                </div>
              </div>

              {/* 进度条 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">总体完成率</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(stats.completedCrawls / (stats.completedCrawls + stats.pendingCrawls + stats.failedCrawls) * 100) || 0}%
                  </span>
                </div>
                <Progress
                  value={stats.completedCrawls / (stats.completedCrawls + stats.pendingCrawls + stats.failedCrawls) * 100 || 0}
                  className="h-3 bg-gray-200 dark:bg-gray-700"
                />
              </div>
            </CardContent>
          </Card>

          {/* 实时活动 */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-purple-500/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">
                实时活动
              </CardTitle>
              <CardDescription>
                最近的任务动态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentTasks.slice(0, 5).map((task, index) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === 'completed' ? 'bg-green-500' :
                      task.status === 'running' ? 'bg-blue-500 animate-pulse' :
                      'bg-red-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.keyword}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(task.startedAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <Badge variant={
                      task.status === 'completed' ? 'default' :
                      task.status === 'running' ? 'secondary' :
                      'destructive'
                    } className="text-xs">
                      {task.status === 'completed' ? '完成' :
                       task.status === 'running' ? '运行中' : '失败'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 任务列表详情 */}
        {showTasks && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-500/10 via-gray-500/5 to-slate-500/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">爬虫任务列表</CardTitle>
              <CardDescription>详细的任务执行记录</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : tasksList.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {tasksList.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-lg">{task.keyword}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            task.status === 'completed' ? 'default' :
                            task.status === 'failed' ? 'destructive' :
                            task.status === 'running' ? 'secondary' : 'outline'
                          }>
                            {task.status === 'completed' ? '已完成' :
                             task.status === 'failed' ? '失败' :
                             task.status === 'running' ? '进行中' : '等待中'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteTask(task.id)}
                            disabled={deleteLoading === task.id}
                          >
                            {deleteLoading === task.id ? (
                              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>开始时间: {new Date(task.startedAt).toLocaleString('zh-CN')}</div>
                        {task.completedAt && (
                          <div>完成时间: {new Date(task.completedAt).toLocaleString('zh-CN')}</div>
                        )}
                      </div>

                      {(task.status === 'completed' || task.totalRepositories > 0) && (
                        <div className="text-sm">
                          <span className="font-medium">总仓库数: </span>
                          <span className="text-blue-600 dark:text-blue-400">{task.totalRepositories}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无爬虫任务数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 数据可视化图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 语言分布饼图 */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-blue-500/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">语言分布</CardTitle>
              <CardDescription>按仓库数量的编程语言分布</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.languageDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.languageDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={renderCustomTooltip} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 技术栈概览 */}
          <TechStatsOverview className="border-0 shadow-lg bg-gradient-to-br from-green-500/10 via-green-500/5 to-emerald-500/10 backdrop-blur-sm" />
        </div>

        {/* 热门仓库列表 */}
        <TrendingHotRepositories
          className="border-0 shadow-lg bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-red-500/10 backdrop-blur-sm"
          limit={6}
        />
      </div>
    </div>
  )
}
