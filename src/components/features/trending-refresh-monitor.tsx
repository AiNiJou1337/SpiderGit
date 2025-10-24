'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChevronDown, ChevronUp, RefreshCw, CheckCircle2, XCircle, Clock, Activity } from 'lucide-react'

interface RefreshStatus {
  isRunning: boolean
  startTime: number | null
  estimatedTime: number // 秒
  currentPhase: 'idle' | 'daily' | 'weekly' | 'monthly' | 'saving' | 'completed' | 'failed'
  progress: number // 0-100
  message: string
  languages: string[]
  currentLanguage: string
  languageProgress: number
  languageTotal: number
}

interface TrendingRefreshMonitorProps {
  isRefreshing: boolean
  onRefreshComplete?: () => void
}

export function TrendingRefreshMonitor({ isRefreshing, onRefreshComplete }: TrendingRefreshMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [status, setStatus] = useState<RefreshStatus>({
    isRunning: false,
    startTime: null,
    estimatedTime: 600, // 10分钟
    currentPhase: 'idle',
    progress: 0,
    message: '等待开始...',
    languages: [],
    currentLanguage: '',
    languageProgress: 0,
    languageTotal: 28
  })

  const [elapsedTime, setElapsedTime] = useState(0)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const timeInterval = useRef<NodeJS.Timeout | null>(null)

  // 当开始刷新时，展开面板并开始计时
  useEffect(() => {
    if (isRefreshing && !status.isRunning) {
      setIsExpanded(true)
      setStatus(prev => ({
        ...prev,
        isRunning: true,
        startTime: Date.now(),
        currentPhase: 'daily',
        message: '正在启动爬虫...'
      }))

      // 开始计时器
      timeInterval.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)

      // 模拟进度更新（因为后端是异步的，我们无法实时获取真实进度）
      simulateProgress()
    } else if (!isRefreshing && status.isRunning) {
      // 刷新完成
      setStatus(prev => ({
        ...prev,
        isRunning: false,
        currentPhase: 'completed',
        progress: 100,
        message: '数据刷新完成！'
      }))

      if (timeInterval.current) {
        clearInterval(timeInterval.current)
        timeInterval.current = null
      }

      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
        pollingInterval.current = null
      }

      // 通知父组件刷新完成
      onRefreshComplete?.()

      // 3秒后自动收起
      setTimeout(() => {
        setIsExpanded(false)
        setElapsedTime(0)
      }, 3000)
    }
  }, [isRefreshing, status.isRunning, onRefreshComplete])

  // 模拟进度（实际进度需要后端支持WebSocket或轮询）
  const simulateProgress = () => {
    const phases = [
      { phase: 'daily' as const, duration: 150, message: '正在爬取每日趋势数据...' },
      { phase: 'weekly' as const, duration: 200, message: '正在爬取每周趋势数据...' },
      { phase: 'monthly' as const, duration: 200, message: '正在爬取每月趋势数据...' },
      { phase: 'saving' as const, duration: 50, message: '正在保存数据...' }
    ]

    let currentPhaseIndex = 0
    let phaseStartTime = Date.now()

    pollingInterval.current = setInterval(() => {
      const now = Date.now()
      const currentPhaseConfig = phases[currentPhaseIndex]
      const phaseElapsed = (now - phaseStartTime) / 1000

      if (phaseElapsed >= currentPhaseConfig.duration) {
        // 进入下一阶段
        currentPhaseIndex++
        phaseStartTime = now

        if (currentPhaseIndex >= phases.length) {
          // 所有阶段完成
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current)
            pollingInterval.current = null
          }
          return
        }

        const nextPhase = phases[currentPhaseIndex]
        setStatus(prev => ({
          ...prev,
          currentPhase: nextPhase.phase,
          message: nextPhase.message,
          languageProgress: 0
        }))
      } else {
        // 更新当前阶段进度
        const phaseProgress = (phaseElapsed / currentPhaseConfig.duration) * 100
        const totalProgress = ((currentPhaseIndex * 25) + (phaseProgress * 0.25))

        // 模拟语言进度
        const languageIndex = Math.floor((phaseProgress / 100) * status.languageTotal)

        setStatus(prev => ({
          ...prev,
          progress: Math.min(totalProgress, 98), // 最多到98%，等待真实完成
          languageProgress: languageIndex,
          currentLanguage: getLanguageName(languageIndex)
        }))
      }
    }, 1000)
  }

  const getLanguageName = (index: number): string => {
    const languages = [
      'all', 'javascript', 'python', 'java', 'typescript', 'c++', 'c#', 'php',
      'c', 'shell', 'go', 'rust', 'kotlin', 'swift', 'dart', 'ruby',
      'scala', 'r', 'matlab', 'perl', 'lua', 'haskell', 'clojure',
      'vue', 'html', 'css', 'scss', 'less'
    ]
    return languages[index] || ''
  }

  const getPhaseIcon = () => {
    switch (status.currentPhase) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'idle':
        return <Clock className="w-4 h-4 text-gray-400" />
      default:
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
    }
  }

  const getPhaseColor = () => {
    switch (status.currentPhase) {
      case 'daily':
        return 'bg-blue-500'
      case 'weekly':
        return 'bg-purple-500'
      case 'monthly':
        return 'bg-green-500'
      case 'saving':
        return 'bg-amber-500'
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeInterval.current) clearInterval(timeInterval.current)
      if (pollingInterval.current) clearInterval(pollingInterval.current)
    }
  }, [])

  if (!isRefreshing && !isExpanded && status.currentPhase === 'idle') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className={`shadow-lg transition-all duration-300 ${
        isExpanded ? 'w-96' : 'w-72'
      }`}>
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getPhaseIcon()}
              <CardTitle className="text-sm font-medium">
                趋势数据刷新
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {status.isRunning && (
                <Badge variant="outline" className="text-xs">
                  {formatTime(elapsedTime)} / {formatTime(status.estimatedTime)}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 space-y-3">
            {/* 整体进度 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">整体进度</span>
                <span className="font-medium">{Math.round(status.progress)}%</span>
              </div>
              <Progress value={status.progress} className="h-2" />
            </div>

            {/* 当前阶段 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">当前阶段</span>
                <Badge variant="secondary" className="text-xs">
                  {status.currentPhase === 'daily' && '每日趋势'}
                  {status.currentPhase === 'weekly' && '每周趋势'}
                  {status.currentPhase === 'monthly' && '每月趋势'}
                  {status.currentPhase === 'saving' && '保存数据'}
                  {status.currentPhase === 'completed' && '完成'}
                  {status.currentPhase === 'failed' && '失败'}
                  {status.currentPhase === 'idle' && '待机'}
                </Badge>
              </div>

              {/* 阶段进度条 */}
              <div className="flex space-x-1">
                {['daily', 'weekly', 'monthly', 'saving'].map((phase, index) => (
                  <div
                    key={phase}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      status.currentPhase === phase
                        ? getPhaseColor()
                        : index < ['daily', 'weekly', 'monthly', 'saving'].indexOf(status.currentPhase)
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 语言进度 */}
            {status.isRunning && status.currentLanguage && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">正在爬取</span>
                  <Badge variant="outline" className="text-xs">
                    {status.currentLanguage}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{status.languageProgress} / {status.languageTotal} 语言</span>
                </div>
              </div>
            )}

            {/* 状态消息 */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground flex items-center space-x-2">
                {status.isRunning && (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                )}
                <span>{status.message}</span>
              </p>
            </div>

            {/* 估计剩余时间 */}
            {status.isRunning && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>预计剩余时间</span>
                <span className="font-medium">
                  {formatTime(Math.max(0, status.estimatedTime - elapsedTime))}
                </span>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

