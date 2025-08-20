'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { RefreshCw, Play, Pause, AlertCircle, CheckCircle, Clock, X, ChevronDown, ChevronUp, History, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CrawlTask {
  id: number
  keyword: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message?: string
  startedAt: string
  completedAt?: string
  totalRepositories: number
  pythonRepositories: number
  javaRepositories: number
}

interface CrawlerMonitorProps {
  className?: string
}

export default function CrawlerMonitor({ className }: CrawlerMonitorProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<CrawlTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [notifications, setNotifications] = useState<Array<{id: string, type: 'success' | 'error', message: string, keyword: string}>>([])
  const previousTasksRef = useRef<CrawlTask[]>([])

  // 部署时间戳 - 用于过滤新请求（可以从环境变量或构建时间获取）
  const deploymentTimestamp = useRef<Date>(new Date('2025-08-14T00:00:00Z')) // 当前部署时间

  // 过滤部署后的新任务
  const getNewTasks = (allTasks: CrawlTask[]) => {
    return allTasks.filter(task => {
      const taskDate = new Date(task.startedAt)
      return taskDate >= deploymentTimestamp.current
    })
  }

  // 检查任务状态变化并添加通知（移出 fetchTasks，避免闭包捕获旧 state）
  const checkTaskStatusChanges = (oldTasks: CrawlTask[], newTasks: CrawlTask[]) => {
    newTasks.forEach(newTask => {
      const oldTask = oldTasks.find(t => t.id === newTask.id)
      if (oldTask && oldTask.status === 'running' && newTask.status !== 'running') {
        const notificationId = `${newTask.id}-${Date.now()}`
        if (newTask.status === 'completed') {
          addNotification(notificationId, 'success', `关键词 "${newTask.keyword}" 爬取完成！`, newTask.keyword)
        } else if (newTask.status === 'failed') {
          addNotification(notificationId, 'error', `关键词 "${newTask.keyword}" 爬取失败`, newTask.keyword)
        }
      }
    })
  }

  // 添加/移除通知（放在组件作用域，避免重复定义）
  const addNotification = (id: string, type: 'success' | 'error', message: string, keyword: string) => {
    setNotifications(prev => [...prev, { id, type, message, keyword }])
    setTimeout(() => removeNotification(id), 5000)
  }
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // 获取任务状态（优化版本，减少频繁查询）
  const fetchTasks = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      const response = await fetch('/api/crawl/list?limit=50') // 获取更多任务用于过滤
      if (response.ok) {
        const data = await response.json()
        const allTasks: CrawlTask[] = data.tasks || []
        const newTasks = getNewTasks(allTasks) // 只显示部署后的新任务

        const prevTasks = previousTasksRef.current
        const hasChanged = newTasks.length !== prevTasks.length ||
          newTasks.some(newTask => {
            const oldTask = prevTasks.find(t => t.id === newTask.id)
            return !oldTask ||
              newTask.status !== oldTask.status ||
              newTask.progress !== oldTask.progress ||
              newTask.message !== oldTask.message
          })

        if (hasChanged) {
          checkTaskStatusChanges(prevTasks, newTasks)
          setTasks(newTasks)
          setLastUpdate(new Date())
          previousTasksRef.current = newTasks
        }
      }
    } catch (error) {
      console.error('获取爬虫任务失败:', error)
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    fetchTasks(true) // 初始加载显示loading
  }, [])

  // 自动刷新（修复闪屏问题）
  useEffect(() => {
    if (!autoRefresh) return

    // 使用固定的刷新间隔，避免频繁重建interval
    const interval = setInterval(() => {
      fetchTasks(false) // 自动刷新不显示loading，减少闪屏
    }, 15000) // 固定15秒刷新间隔

    return () => clearInterval(interval)
  }, [autoRefresh])

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'pending':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 计算运行时间
  const getRunningTime = (startedAt: string) => {
    const start = new Date(startedAt)
    const now = new Date()
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000)
    
    if (diff < 60) return `${diff}秒`
    if (diff < 3600) return `${Math.floor(diff / 60)}分${diff % 60}秒`
    return `${Math.floor(diff / 3600)}时${Math.floor((diff % 3600) / 60)}分`
  }

  const runningTasks = tasks.filter(task => task.status === 'running')
  const pendingTasks = tasks.filter(task => task.status === 'pending')
  const completedTasks = tasks.filter(task => task.status === 'completed')
  const failedTasks = tasks.filter(task => task.status === 'failed')

  return (
    <>
      {/* 通知区域 */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border max-w-sm ${
                notification.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">{notification.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeNotification(notification.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 主要内容 */}
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1"
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                爬虫实时监控
                <Badge variant="secondary" className="ml-2">
                  {tasks.length} 个新任务
                </Badge>
              </CardTitle>
              <CardDescription>
                {isCollapsed ? '点击展开查看详情' : '监控部署后的新爬虫任务'}
                {lastUpdate && (
                  <span className="ml-2 text-xs">
                    最后更新: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard?tab=crawler')}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              查看历史
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  暂停
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  开始
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTasks(true)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{runningTasks.length}</div>
            <div className="text-xs text-blue-600">运行中</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded-lg">
            <div className="text-lg font-bold text-yellow-600">{pendingTasks.length}</div>
            <div className="text-xs text-yellow-600">等待中</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{completedTasks.length}</div>
            <div className="text-xs text-green-600">已完成</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{failedTasks.length}</div>
            <div className="text-xs text-red-600">失败</div>
          </div>
        </div>

        {/* 任务列表 */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {isLoading ? '加载中...' : '暂无活跃的爬虫任务'}
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="border rounded-lg p-4 space-y-3"
              >
                {/* 任务头部 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <span className="font-medium">关键词: {task.keyword}</span>
                    <Badge variant="outline" className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {task.id}
                  </div>
                </div>

                {/* 进度条 */}
                {task.status === 'running' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>进度</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-2" />
                  </div>
                )}

                {/* 任务信息 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">开始时间:</span>
                    <span className="ml-1">{formatTime(task.startedAt)}</span>
                  </div>
                  {task.status === 'running' && (
                    <div>
                      <span className="text-gray-500">运行时间:</span>
                      <span className="ml-1">{getRunningTime(task.startedAt)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">总仓库:</span>
                    <span className="ml-1">{task.totalRepositories}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Python:</span>
                    <span className="ml-1">{task.pythonRepositories}</span>
                  </div>
                </div>

                {/* 消息 */}
                {task.message && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {task.message}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        </CardContent>
      )}
    </Card>
    </>
  )
}
