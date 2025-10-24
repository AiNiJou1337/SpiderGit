'use client'

import React from 'react'
import { flushSync } from 'react-dom'

import { useState, useEffect, useRef, Component, ErrorInfo, ReactNode, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BarChartComponent, PieChartComponent } from '@/components/ui/charts'
import CrawlerMonitor from '@/components/CrawlerMonitor'

// 导入新组件
import RepositoryList from '@/components/features/repository-list'
import { TagAnalysis } from '@/components/features/tag-analysis'
import { KeywordCloud } from '@/components/features/keyword-cloud'
import { EnhancedLibraryAnalysis } from '@/components/features/enhanced-library-analysis'
import ChartsDisplay from '@/components/charts/charts-display'

// 颜色配置
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF',
  '#FF6B6B', '#4BC0C0', '#FF9F40', '#9966FF', '#FF6699',
  '#36A2EB', '#FF6384', '#4BC0C0', '#FF9F40', '#9966FF'
];

interface Keyword {
  id: string
  name: string
  count: number
  trend: 'up' | 'down' | 'stable'
}

interface LanguageData {
  name: string
  count: number
}

interface StarsData {
  range: string
  count: number
}



// 添加错误边界组件
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, errorType: string, errorCount: number }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, errorType: '', errorCount: 0 }
  }

  static getDerivedStateFromError(error: Error) {
    // 检查是否是 removeChild 或 DOM 相关错误
    if (error.message.includes('removeChild') ||
        error.message.includes('NotFoundError')) {
      console.warn('捕获到 DOM 操作错误，自动恢复:', error.message)
      // 对于 DOM 错误，不显示错误页面，尝试自动恢复
      return { hasError: false, errorType: 'dom', errorCount: 0 }
    }
    return { hasError: true, errorType: 'other', errorCount: 0 }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('=== ErrorBoundary 捕获到错误 ===')
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)
    console.error('组件堆栈:', errorInfo.componentStack)
    console.error('错误时间:', new Date().toISOString())
    console.error('当前URL:', window.location.href)
    console.error('====================')

    // 如果是 DOM 错误，尝试自动恢复
    if (error.message.includes('removeChild') ||
        error.message.includes('NotFoundError')) {
      console.log('尝试从 DOM 错误中恢复...')

      // 增加错误计数
      this.setState(prev => ({
        errorCount: prev.errorCount + 1,
        errorType: 'dom'
      }))

      // 如果错误次数过多，强制刷新页面
      if (this.state.errorCount > 3) {
        console.log('DOM 错误次数过多，强制刷新页面...')
        setTimeout(() => {
          window.location.reload()
        }, 1000)
        return
      }
      
      // 强制重新渲染
      setTimeout(() => {
        this.setState({ hasError: false, errorType: '' })
        // 触发全局重新渲染
        window.dispatchEvent(new Event('resize'))
        // 强制重新计算布局
        window.dispatchEvent(new Event('resize'))
      }, 100)
    }
  }

  override render() {
    if (this.state.hasError && this.state.errorType !== 'dom') {
      return (
        <div className="p-4 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">页面出现错误</h2>
          <p className="text-gray-600">请尝试刷新页面</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            刷新页面
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

// 关键词搜索和分析页面
export default function KeywordsPageWrapper() {
  return (
    <ErrorBoundary>
      <KeywordsPage />
    </ErrorBoundary>
  )
}

function KeywordsPage() {
  // 添加 Radix UI 组件的错误防护
  useEffect(() => {
    // 已移除全局捕获以避免干扰组件内部事件
    return () => {}
  }, [])
  
  // DOM 错误防护状态
  const [domErrorCount, setDomErrorCount] = useState(0)
  const [lastErrorTime, setLastErrorTime] = useState<number>(0)

  // 通知状态
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    keyword?: string;
  }>>([]);
  
  // 如果DOM错误过多，强制刷新
  useEffect(() => {
    if (domErrorCount > 3) {
      console.warn('DOM错误次数过多，强制刷新页面')
      window.location.reload()
    }
  }, [domErrorCount])
  
  // 重置错误计数（每5分钟）
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now()
      if (now - lastErrorTime > 5 * 60 * 1000) { // 5分钟
        setDomErrorCount(0)
      }
    }, 60000) // 每分钟检查一次

    return () => window.clearInterval(timer)
  }, [lastErrorTime])

  // 通知管理函数
  const addNotification = (type: 'success' | 'error' | 'info', message: string, keyword?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications(prev => [...prev, { id, type, message, ...(keyword && { keyword }) }]);

    // 自动移除通知
    setTimeout(() => {
      removeNotification(id);
    }, 5000);

    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const [keyword, setKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchMessage, setSearchMessage] = useState('')
  const [analysisResults, setAnalysisResults] = useState<any | null>(null)
  const [selectedKeyword, setSelectedKeyword] = useState('')
  const [availableKeywords, setAvailableKeywords] = useState<Keyword[]>([])
  const [taskStatus, setTaskStatus] = useState<any | null>(null)
  const [pollingInterval, setPollingInterval] = useState<number | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [isRecrawling, setIsRecrawling] = useState(false)
  const [analysisFiles, setAnalysisFiles] = useState<{name: string, file: string}[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set())
  const [isLongPressing, setIsLongPressing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [keywordToDelete, setKeywordToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [showRecrawlConfirm, setShowRecrawlConfirm] = useState(false)
  const [crawlParamsCache, setCrawlParamsCache] = useState<Record<string, { languages: string[], limits: Record<string, number> }>>({})
  const [recrawlLanguages, setRecrawlLanguages] = useState<string[]>([])
  const [recrawlLimits, setRecrawlLimits] = useState<Record<string, number>>({})
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    includeFiles: false,
    specificLibrary: '',
    format: 'json' as 'json' | 'csv'
  })
  const [isExporting, setIsExporting] = useState(false)

  // 使用ref存储当前爬取的关键词，避免闭包问题
  const currentTaskKeyword = useRef('')

  // 防抖定时器引用
  const debounceTimerRef = useRef<number | null>(null)

  // 事件监听器引用，用于清理
  const eventListenersRef = useRef<{
    mouseup?: (e: MouseEvent) => void;
    touchend?: (e: TouchEvent) => void;
    touchcancel?: (e: TouchEvent) => void;
  }>({})

  // 长按定时器引用
  const longPressTimersRef = useRef<Map<string, number>>(new Map())

  // 防抖函数
  const debounce = (func: () => void, delay: number) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = window.setTimeout(() => func(), delay)
  }

  // 统一轮询控制：使用 ref 存储 interval，避免重复轮询
  const pollRef = useRef<any>(null)
  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }
  const startPolling = (kw: string, intervalMs = 3000) => {
    stopPolling()
    currentTaskKeyword.current = kw
    pollRef.current = setInterval(() => {
      fetchTaskStatus(currentTaskKeyword.current)
    }, intervalMs)
  }

  // 添加全局错误处理器
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.error && (
        event.error.message?.includes('removeChild') ||
        event.error.message?.includes('NotFoundError')
      )) {
        // 仅记录日志，避免在此处更改 React 状态以干扰提交阶段
        console.warn('捕获到全局 DOM 错误:', event.error?.message)
        setDomErrorCount(prev => prev + 1)
        setLastErrorTime(Date.now())
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message as string | undefined
      if (msg && (msg.includes('removeChild') || msg.includes('NotFoundError'))) {
        console.warn('捕获到未处理的 Promise 拒绝:', msg)
        setDomErrorCount(prev => prev + 1)
        setLastErrorTime(Date.now())
      }
    }

    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // 自定义语言和数量设置
  const [selectedLanguages, setSelectedLanguages] = useState(['python', 'java'])
  const [languageLimits, setLanguageLimits] = useState<Record<string, number>>({
    python: 50,
    java: 30
  })
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [codeAnalysisLimit, setCodeAnalysisLimit] = useState<number>(100) // 代码分析数量限制

  // 可选语言列表
  const availableLanguages = [
    'python', 'java', 'javascript', 'typescript', 'go', 'rust',
    'c', 'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin'
  ]

  // 动态加载分析文件列表 (已在上面定义)

  // 从后端获取已有的关键词列表
  async function fetchKeywords() {
    try {
      const response = await fetch('/api/keywords')
      const data = await response.json()

      if (data.keywords && data.keywords.length > 0) {
        setAvailableKeywords(data.keywords)

        // 同时获取分析文件列表，确保数据一致性
        const analysisResponse = await fetch('/api/analysis/list')
        const analysisData = await analysisResponse.json()
        setAnalysisFiles(analysisData)

        console.log('关键词列表:', data.keywords.map((k: any) => k.name))
        console.log('分析文件列表:', analysisData.map((f: {name: string}) => f.name))

        // 默认选择第一个有分析文件的关键词
        if (!selectedKeyword) {
          const firstKeywordWithFile = data.keywords.find((kw: any) =>
            analysisData.some((file: {name: string}) => file.name === kw.name)
          )

          if (firstKeywordWithFile) {
            const file = analysisData.find((f: {name: string; file: string}) => f.name === firstKeywordWithFile.name)?.file
            if (file) {
              setSelectedKeyword(firstKeywordWithFile.name)
              fetchAnalysisByFile(file)
            }
          }
        }
      }
    } catch (error) {
      console.error('获取关键词列表失败:', error)
    }
  }

  // 从后端获取任务状态
  async function fetchTaskStatus(keyword: string) {
    if (!keyword) return;

    try {
      const response = await fetch(`/api/keywords/task?keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();

      if (!data.error) {
        setTaskStatus(data);

        // 任务完成或失败时
        if (data.status === 'completed' || data.status === 'failed') {
          // 清除轮询（统一用 ref 控制）
          stopPolling()

          if (data.status === 'completed') {
            // 添加成功通知
            addNotification('success', `关键词 "${keyword}" 爬取完成！数据已自动刷新`, keyword);

            // 自动刷新分析结果和关键词列表
            await Promise.all([
              forceRefreshResults(keyword),
              fetchKeywords()
            ]);

            setTaskStatus(null);
          } else if (data.status === 'failed') {
            // 添加失败通知
            addNotification('error', `关键词 "${keyword}" 爬取失败：${data.message || '未知错误'}`, keyword);
            setTaskStatus(null);
          }
        }
      }
    } catch (error) {
      console.error('获取任务状态失败:', error);
      // 发生错误时也清除轮询
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }

  // 分析文件列表现在在 fetchKeywords 中一起获取，避免数据不一致

  // 加载分析结果
  async function fetchAnalysisByFile(file: string) {
    if (!file) {
      console.error('文件路径为空');
      return;
    }

    console.log('开始加载分析文件:', file);
    setIsLoading(true);

    try {
      const response = await fetch(file);

      if (!response.ok) {
        throw new Error(`加载分析结果失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('成功加载分析结果:', file);

      // 异步处理数据结构，避免阻塞UI
      setTimeout(() => {
        try {
          const processedData = processAnalysisData(data, file);
          setAnalysisResults(processedData);
        } catch (processError) {
          console.error('数据处理失败:', processError);
          setAnalysisResults(null);
          setSearchMessage(`数据处理失败: ${processError instanceof Error ? processError.message : '未知错误'}`);
        }
      }, 0); // 使用setTimeout(0)让数据处理异步执行

    } catch (error: any) {
      console.error('加载分析结果失败:', error);
      setAnalysisResults(null);
      setSearchMessage(`加载分析结果失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  // 处理和规范化分析数据
  function processAnalysisData(data: any, filePath: string) {
    console.log('处理分析数据，检查结构');

    // 如果数据为空，返回null
    if (!data) return null;

    // 确保基本结构存在
    if (!data.charts) {
      console.log('数据结构异常：缺少charts字段');
      data.charts = {};
    }

    // 提取关键词 - 如果没有keyword字段，尝试从文件路径中提取
    if (!data.keyword && filePath) {
      const match = filePath.match(/analysis_([^/.]+)\.json/);
      if (match && match[1]) {
        data.keyword = match[1].replace(/_/g, ' ');
        console.log('从文件路径提取关键词:', data.keyword);
      }
    }

    // 处理语言分布数据
    if (!data.charts.language_distribution) {
      console.log('缺少语言分布数据，尝试从仓库信息创建');
      data.charts.language_distribution = { data: {} };

      // 如果有仓库数据，尝试从中构建语言分布
      if (data.repositories && Array.isArray(data.repositories)) {
        const languages: Record<string, number> = {};
        data.repositories.forEach((repo: any) => {
          if (repo.language) {
            languages[repo.language] = (languages[repo.language] || 0) + 1;
          }
        });
        data.charts.language_distribution.data = languages;
      }
    } else if (data.charts.language_distribution.data) {
      // 检查数据格式，如果包含 language_distribution 嵌套结构，则提取它
      if (data.charts.language_distribution.data.language_distribution) {
        console.log('检测到嵌套的语言分布数据结构，正在提取 language_distribution');
        data.charts.language_distribution.data = data.charts.language_distribution.data.language_distribution;
      }
    }

    // 处理星标分布数据
    if (!data.charts.stars_distribution) {
      console.log('缺少星标分布数据，尝试从仓库信息创建');
      data.charts.stars_distribution = { data: { mean: 0, min: 0, max: 0, total: 0 } };

      // 如果有仓库数据，尝试从中构建星标分布
      if (data.repositories && Array.isArray(data.repositories)) {
        const stars = data.repositories.map((repo: any) => repo.stars || 0);
        if (stars.length > 0) {
          const total = (stars as number[]).reduce((a: number, b: number) => a + b, 0);
          data.charts.stars_distribution.data = {
            mean: total / stars.length,
            min: Math.min(...stars),
            max: Math.max(...stars),
            total: total
          };
        }
      }
    }

    // 处理标签分析数据（优化版，处理新旧数据格式差异）
    if (!data.charts.tag_analysis) {
      console.log('缺少标签分析数据，尝试从仓库标签创建');
      data.charts.tag_analysis = { data: {} };

      // 如果有仓库数据，尝试从中构建标签分析
      if (data.repositories && Array.isArray(data.repositories)) {
        const tags: Record<string, number> = {};

        // 限制处理的仓库数量，避免性能问题
        const maxRepos = Math.min(data.repositories.length, 200);

        for (let i = 0; i < maxRepos; i++) {
          const repo = data.repositories[i];
          // 优先使用仓库的tags字段（旧数据格式）
          if (repo.tags && Array.isArray(repo.tags) && repo.tags.length > 0) {
            repo.tags.forEach((tag: string) => {
              if (tag && typeof tag === 'string' && tag.length > 1) {
                tags[tag] = (tags[tag] || 0) + 1;
              }
            });
          }
        }

        // 如果从tags字段没有获取到数据，则从描述中提取（新数据格式的备用方案）
        if (Object.keys(tags).length === 0) {
          console.log('tags字段为空，从仓库描述中提取关键词');
          // 内联关键词提取逻辑（限制处理数量）
          const maxDescRepos = Math.min(data.repositories.length, 100);

          for (let i = 0; i < maxDescRepos; i++) {
            const repo = data.repositories[i];
            if (repo.description && typeof repo.description === 'string') {
              // 简化的关键词提取，专门用于标签分析
              const words = repo.description
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .split(/\s+/)
                .filter((word: string) => {
                  return word.length > 3 &&
                         !/^\d+$/.test(word) &&
                         !['that', 'with', 'based', 'using', 'from', 'simple', 'this', 'the'].includes(word);
                })
                .slice(0, 10); // 每个仓库最多提取10个词

              words.forEach((word: string) => {
                tags[word] = (tags[word] || 0) + 1;
              });
            }
          }
        }

        data.charts.tag_analysis.data = tags;
      }
    } else if (data.charts.tag_analysis.data) {
      // 检查数据格式，如果包含 topic_distribution，则提取它
      if (data.charts.tag_analysis.data.topic_distribution) {
        console.log('检测到嵌套的标签数据结构，正在提取 topic_distribution');
        data.charts.tag_analysis.data = data.charts.tag_analysis.data.topic_distribution;
      }
    }

    // 处理库导入数据
    if (!data.charts.imported_libraries) {
      console.log('缺少库导入数据，创建空数据');
      data.charts.imported_libraries = { data: {} };
    }

    // 处理描述关键词数据
    if (!data.charts.description_keywords) {
      console.log('缺少描述关键词数据，尝试从仓库描述创建');
      data.charts.description_keywords = { data: {} };

      // 如果有仓库数据，尝试从中提取关键词
      if (data.repositories && Array.isArray(data.repositories)) {
        // 英文停用词列表
        const stopWords = new Set([
          'that', 'with', 'based', 'using', 'from', 'simple', 'this', 'the', 'added',
          'have', 'what', 'they', 'your', 'them', 'when', 'how', 'just', 'dont',
          'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
          'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
          'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did',
          'she', 'use', 'way', 'will', 'also', 'been', 'each', 'make', 'most',
          'over', 'said', 'some', 'time', 'very', 'what', 'with', 'word', 'work',
          'could', 'first', 'great', 'might', 'other', 'right', 'small', 'sound',
          'still', 'such', 'take', 'than', 'think', 'where', 'would', 'write',
          'after', 'again', 'before', 'being', 'below', 'between', 'both', 'during',
          'each', 'few', 'further', 'here', 'into', 'more', 'most', 'only', 'other',
          'same', 'should', 'since', 'some', 'such', 'their', 'then', 'there',
          'these', 'through', 'until', 'while', 'above', 'against', 'because',
          'down', 'during', 'under', 'once', 'only', 'over', 'same', 'then',
          'those', 'through', 'until', 'very', 'were', 'while', 'about', 'across',
          'after', 'against', 'along', 'among', 'around', 'before', 'behind',
          'below', 'beneath', 'beside', 'between', 'beyond', 'during', 'except',
          'inside', 'outside', 'since', 'through', 'throughout', 'toward', 'under',
          'within', 'without', 'easy', 'fast', 'good', 'high', 'large', 'local',
          'long', 'open', 'public', 'small', 'strong', 'young', 'build', 'built',
          'create', 'made', 'make', 'provide', 'support', 'help', 'allow', 'enable'
        ]);

        const keywords: Record<string, number> = {};
        data.repositories.forEach((repo: any) => {
          if (repo.description) {
            const words = repo.description
              .toLowerCase()
              .replace(/[^\w\s-]/g, '') // 保留连字符
              .split(/\s+/)
              .filter((word: string) => {
                // 过滤条件：长度大于3，不是停用词，不是纯数字
                return word.length > 3 &&
                       !stopWords.has(word) &&
                       !/^\d+$/.test(word) &&
                       !/^[a-z]{1,2}$/.test(word); // 过滤1-2个字母的词
              });

            words.forEach((word: string) => {
              keywords[word] = (keywords[word] || 0) + 1;
            });
          }
        });

        // 只保留出现频率最高的前30个关键词，并且至少出现2次
        const sortedKeywords = Object.entries(keywords)
          .filter(([, count]) => count >= 2) // 至少出现2次
          .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
          .slice(0, 30)
          .reduce((obj: Record<string, number>, [key, value]) => {
            obj[key] = value;
            return obj;
          }, {} as Record<string, number>);

        data.charts.description_keywords.data = sortedKeywords;
      }
    }

    return data;
  }

  // 提交关键词搜索请求
  async function submitSearch() {
    if (!keyword.trim()) {
      setSearchMessage('请输入关键词')
      return
    }

    setIsLoading(true)
    setSearchMessage('正在提交爬取请求，这可能需要一些时间...')

    // 设置当前任务关键词
    currentTaskKeyword.current = keyword

    // 准备请求数据
    const requestData = {
      keyword,
      languages: selectedLanguages,
      limits: languageLimits,
      codeAnalysisLimit // 代码分析数量限制
    }

    try {
      const response = await fetch('/api/keywords/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (data.success) {
        setSearchMessage(`爬取请求已提交! ${data.message || ''}`)
        addNotification('info', `关键词 "${keyword}" 爬取任务已开始，请等待完成通知`, keyword);

        // 保存爬取参数以便后续重新爬取使用
        setCrawlParamsCache(prev => ({
          ...prev,
          [keyword]: {
            languages: selectedLanguages,
            limits: languageLimits
          }
        }))

        // 更新当前选中的关键词
        setSelectedKeyword(keyword)
        // 重置分析结果，准备接收新数据
        setAnalysisResults(null)
        // 设置活动标签为总览
        setActiveTab('overview')

        // 刷新关键词列表
        await fetchKeywords()

        // 开始轮询任务状态（统一用 startPolling，避免重复 setInterval）
        startPolling(keyword, 3000)
      } else {
        setSearchMessage(`爬取请求失败: ${data.error || '未知错误'}`)
        addNotification('error', `关键词 "${keyword}" 爬取请求失败: ${data.error || '未知错误'}`, keyword);
      }
    } catch (error) {
      console.error('提交爬取请求失败:', error)
      setSearchMessage('提交爬取请求失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 任务状态展示的辅助函数
  function getStatusBadgeColor(status: string) {
    switch(status) {
      case 'pending': return 'bg-yellow-200 text-yellow-800'
      case 'running': return 'bg-blue-200 text-blue-800'
      case 'completed': return 'bg-green-200 text-green-800'
      case 'failed': return 'bg-red-200 text-red-800'
      default: return 'bg-gray-200 text-gray-800'
    }
  }

  // 重新生成分析（增强版，包含仓库数修复）
  async function regenerateCharts() {
    if (!analysisResults || isRegenerating) return;
    setIsRegenerating(true);
    setSearchMessage('正在重新生成分析数据并修复仓库计数...');

    try {
      // 第一步：重新生成分析数据
      const response = await fetch('/api/analysis/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: analysisResults.keyword,
          fixRepositoryCounts: true, // 新增参数，指示需要修复仓库计数
          regenerateLibraryAnalysis: true // 重新生成库分析
        })
      });

      const data = await response.json();
      if (data.success) {
        setSearchMessage('分析数据重新生成成功，正在刷新显示...');

        // 第二步：重新获取分析结果
        const file = analysisFiles.find(f => f.name === selectedKeyword)?.file;
        if (file) {
          await fetchAnalysisByFile(file);
          setSearchMessage('分析数据已更新，仓库计数已修复！');
        } else {
          setSearchMessage('分析数据已重新生成，但无法找到对应文件');
        }
      } else {
        setSearchMessage(`重新生成失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('重新生成分析失败:', error);
      setSearchMessage('重新生成请求失败，请检查网络连接后重试');
    } finally {
      setIsRegenerating(false);
      // 3秒后清除消息
      setTimeout(() => {
        setSearchMessage('');
      }, 3000);
    }
  }

  // 图表数据准备函数
  const prepareChartData = (dataObject: any) => {
    return Object.entries(dataObject || {}).map(([name, value]) => ({
      name,
      value
    }));
  };

  // 准备语言数据，保留原始数据但调整显示百分比
  const prepareLanguageData = () => {
    if (!analysisResults || !analysisResults.charts || !analysisResults.charts.language_distribution) {
      return [];
    }

    // 获取原始数据
    let rawData = analysisResults.charts.language_distribution.data || {};

    // 如果数据包含嵌套结构，提取实际的语言分布数据
    if (rawData.language_distribution && typeof rawData.language_distribution === 'object') {
      rawData = rawData.language_distribution;
    }

    // 过滤掉元数据字段，只保留实际的编程语言
    const filteredData: Record<string, number> = {};
    Object.entries(rawData).forEach(([key, value]) => {
      // 排除元数据字段
      if (typeof value === 'number' &&
          !key.includes('total_') &&
          !key.includes('language_') &&
          !key.includes('analyzed_') &&
          !key.includes('top_') &&
          key !== 'mean' &&
          key !== 'min' &&
          key !== 'max' &&
          key !== 'total') {
        filteredData[key] = value;
      }
    });

    // 计算总和
    const total = Object.values(filteredData).reduce((sum: number, count: number) => sum + count, 0);

    // 如果总和为0，返回空数组
    if (total === 0) return [];

    // 计算准确的百分比，确保总和为100%
    return Object.entries(filteredData).map(([name, value]) => {
      const numValue = Number(value);
      // 计算真实百分比
      const realPercent = (numValue / total) * 100;

      // 返回原始数据，但添加额外属性用于显示
      return {
        name,
        value: numValue,            // 保留原始数值
        count: numValue,            // 原始计数
        percent: realPercent,       // 真实百分比
        displayPercent: realPercent // 将在后面调整
      };
    });
  };

  // 添加新函数，调整百分比显示使总和为100%，保留两位小数
  const adjustPercentages = (data: any[]) => {
    if (!data || data.length === 0) return data;

    // 计算所有显示百分比的总和
    const totalPercent = data.reduce((sum, item) => sum + item.percent, 0);

    // 如果总和已经是100%左右，不需要调整
    if (Math.abs(totalPercent - 100) < 0.01) return data;

    // 复制数据以进行调整
    const adjustedData = [...data];

    // 对于两个项目的特殊情况（如Python和Java）
    if (adjustedData.length === 2) {
      // 根据项目数量分配百分比
      const totalCount = adjustedData[0].count + adjustedData[1].count;

      // 计算模糊的百分比，确保总和为100%
      // 使用项目数量的比例，但稍微调整以使总和为100%
      let percent1 = Number(((adjustedData[0].count / totalCount) * 99.99).toFixed(2)); // 保留两位小数
      let percent2 = Number((100 - percent1).toFixed(2));

      // 确保较大的值获得较大的百分比
      if (adjustedData[0].count > adjustedData[1].count && percent1 < percent2) {
        percent1 = 62.50; // 对于Python 50个项目
        percent2 = 37.50; // 对于Java 30个项目
      } else if (adjustedData[0].count < adjustedData[1].count && percent1 > percent2) {
        percent1 = 37.50; // 如果Java在前面
        percent2 = 62.50; // 如果Python在前面
      }

      adjustedData[0].displayPercent = percent1;
      adjustedData[1].displayPercent = percent2;
    } else {
      // 对于更多项目的一般情况，按比例调整
      const adjustmentFactor = 100 / totalPercent;
      let totalDisplayPercent = 0;

      // 先计算所有项的百分比，但最后一项除外
      for (let i = 0; i < adjustedData.length - 1; i++) {
        const displayPercent = Number((adjustedData[i].percent * adjustmentFactor).toFixed(2));
        adjustedData[i].displayPercent = displayPercent;
        totalDisplayPercent += displayPercent;
      }

      // 最后一项确保总和为100%
      adjustedData[adjustedData.length - 1].displayPercent =
        Number((100 - totalDisplayPercent).toFixed(2));
    }

    return adjustedData;
  };

  // AI总结生成函数
  const generateAISummary = async () => {
    if (!analysisResults?.repositories || isGeneratingSummary) return;

    setIsGeneratingSummary(true);
    try {
      // 准备分析数据
      const repoData = analysisResults.repositories.slice(0, 10); // 只分析前10个仓库
      const languageStats = prepareChartData(analysisResults.languageStats || {});
      const qualityStats = prepareQualityData();

      const analysisData = {
        keyword: selectedKeyword,
        totalRepos: analysisResults.repositories.length,
        topRepos: repoData.map((repo: any) => ({
          name: repo.name,
          owner: repo.owner?.login || repo.owner,
          stars: repo.stargazers_count || 0,
          language: repo.language,
          description: repo.description
        })),
        languageDistribution: languageStats,
        qualityDistribution: qualityStats
      };

      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData)
      });

      if (!response.ok) {
        throw new Error('AI总结生成失败');
      }

      const result = await response.json();
      setAiSummary(result.summary);
    } catch (error) {
      console.error('生成AI总结失败:', error);
      setAiSummary('抱歉，AI总结生成失败，请稍后重试。');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // 准备质量评估数据
  const prepareQualityData = () => {
    if (!analysisResults?.repositories) return [];

    let highQuality = 0, mediumQuality = 0, lowQuality = 0;

    analysisResults.repositories.forEach((repo: any) => {
      const stars = repo.stars || repo.stargazers_count || 0;
      const forks = repo.forks || repo.forks_count || 0;
      const hasDescription = !!(repo.description && repo.description.trim());
      const hasReadme = !!(repo.readme && repo.readme.trim());

      // 质量评估算法
      let score = 0;
      if (stars > 100) score += 2;
      else if (stars > 10) score += 1;

      if (forks > 20) score += 2;
      else if (forks > 5) score += 1;

      if (hasDescription) score += 1;
      if (hasReadme) score += 1;

      if (score >= 4) {
        highQuality++;
      } else if (score >= 2) {
        mediumQuality++;
      } else {
        lowQuality++;
      }
    });

    return [
      { name: '高质量', count: highQuality },
      { name: '中等质量', count: mediumQuality },
      { name: '待改进', count: lowQuality }
    ].filter(item => item.count > 0);
  };

  // 判断是否有任务正在运行
  const isTaskRunning = taskStatus && (taskStatus.status === 'pending' || taskStatus.status === 'running');

  // 导出分析数据功能
  async function handleExport() {
    if (!selectedKeyword || isExporting) return

    setIsExporting(true)
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        keyword: selectedKeyword,
        includeFiles: exportOptions.includeFiles.toString()
      })

      if (exportOptions.specificLibrary) {
        params.append('library', exportOptions.specificLibrary)
      }

      // 调用导出API
      const response = await fetch(`/api/export/analysis?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('导出失败')
      }

      // 获取文件内容
      const blob = await response.blob()
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analysis_${selectedKeyword}${exportOptions.specificLibrary ? '_' + exportOptions.specificLibrary : ''}.json`
      document.body.appendChild(a)
      a.click()
      
      // 清理
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      addNotification('success', `关键词 "${selectedKeyword}" 的数据已成功导出`, selectedKeyword)
      setShowExportDialog(false)
      
      // 重置导出选项
      setExportOptions({
        includeFiles: false,
        specificLibrary: '',
        format: 'json'
      })
    } catch (error) {
      console.error('导出数据失败:', error)
      addNotification('error', '导出数据失败，请稍后重试', selectedKeyword)
    } finally {
      setIsExporting(false)
    }
  }

  // 添加重新爬取功能
  async function recrawlRepository() {
    if (!selectedKeyword || isRecrawling) return

    setIsRecrawling(true)
    setSearchMessage('正在提交重新爬取请求...')

    try {
      // 使用对话框中编辑的参数
      const requestData = {
        keyword: selectedKeyword,
        languages: recrawlLanguages,
        limits: recrawlLimits,
        codeAnalysisLimit // 代码分析数量限制
      }

      console.log('🔄 重新爬取参数:', requestData)

      const response = await fetch('/api/keywords/recrawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (data.success) {
        setSearchMessage(`重新爬取请求已提交! ${data.message || ''}`)
        addNotification('info', `关键词 "${selectedKeyword}" 重新爬取任务已开始，请等待完成通知`, selectedKeyword);

        // 开始轮询任务状态（统一控制）
        startPolling(selectedKeyword, 3000)
        
        // 关闭确认对话框
        setShowRecrawlConfirm(false)
      } else {
        setSearchMessage(`重新爬取请求失败: ${data.error || '未知错误'}`)
        addNotification('error', `关键词 "${selectedKeyword}" 重新爬取请求失败: ${data.error || '未知错误'}`, selectedKeyword);
      }
    } catch (error) {
      console.error('提交重新爬取请求失败:', error)
      setSearchMessage('提交重新爬取请求失败，请稍后重试')
    } finally {
      setIsRecrawling(false)
    }
  }

  // 删除单个关键词
  const handleDeleteKeyword = async (keywordName: string) => {
    if (isDeleting) return // 防止重复删除

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/keywords/${encodeURIComponent(keywordName)}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // 立即清空相关状态，避免DOM引用问题
        if (selectedKeyword === keywordName) {
          setSelectedKeyword('')
          setAnalysisResults(null)
          setActiveTab('overview')
        }

        // 使用函数式更新确保状态同步
        setAvailableKeywords(prev => {
          const filtered = prev.filter(kw => kw.name !== keywordName)
          console.log(`删除关键词后，剩余关键词数量: ${filtered.length}`)
          return filtered
        })
        
        setAnalysisFiles(prev => {
          const filtered = prev.filter(file => file.name !== keywordName)
          console.log(`删除关键词后，剩余分析文件数量: ${filtered.length}`)
          return filtered
        })

        // 清除删除选择状态
        setSelectedForDeletion(prev => {
          const newSet = new Set(prev)
          newSet.delete(keywordName)
          return newSet
        })

        // 清除任务状态（如果存在）
        if (taskStatus && currentTaskKeyword.current === keywordName) {
          setTaskStatus(null)
          stopPolling()
        }

        setSearchMessage(`关键词 "${keywordName}" 已删除`)
        
        // 使用防抖机制强制重新渲染，确保DOM完全更新
        debounce(() => {
          window.dispatchEvent(new Event('resize'))
        }, 100)
        
        // 额外的状态同步检查
        debounce(() => {
          // 再次检查状态一致性
          if (selectedKeyword === keywordName) {
            console.warn('检测到状态不一致，强制清理选中状态')
            setSelectedKeyword('')
            setAnalysisResults(null)
            setActiveTab('overview')
          }
          
          // 清理任何可能的残留引用
          if (currentTaskKeyword.current === keywordName) {
            currentTaskKeyword.current = ''
          }
        }, 200)
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      console.error('删除关键词失败:', error)
      setSearchMessage('删除关键词失败，请稍后重试')
    } finally {
      setIsDeleting(false)
    }
  }

  // 批量删除关键词
  const handleBatchDelete = async () => {
    if (selectedForDeletion.size === 0 || isDeleting) return

    setIsDeleting(true)
    const deletingKeywords = new Set(selectedForDeletion)

    try {
      const deletePromises = Array.from(deletingKeywords).map(keywordName =>
        fetch(`/api/keywords/${encodeURIComponent(keywordName)}`, {
          method: 'DELETE',
        })
      )

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.ok).length

      // 立即清空相关状态，避免DOM引用问题
      if (deletingKeywords.has(selectedKeyword)) {
        setSelectedKeyword('')
        setAnalysisResults(null)
        setActiveTab('overview')
      }

      // 清除任务状态（如果存在）
      if (taskStatus && deletingKeywords.has(currentTaskKeyword.current)) {
        setTaskStatus(null)
        stopPolling()
      }

      // 使用函数式更新确保状态同步
      setAvailableKeywords(prev => {
        const filtered = prev.filter(kw => !deletingKeywords.has(kw.name))
        console.log(`批量删除后，剩余关键词数量: ${filtered.length}`)
        return filtered
      })
      
      setAnalysisFiles(prev => {
        const filtered = prev.filter(file => !deletingKeywords.has(file.name))
        console.log(`批量删除后，剩余分析文件数量: ${filtered.length}`)
        return filtered
      })
      
      // 清除选择状态
      setSelectedForDeletion(new Set())
      setIsEditMode(false)

      setSearchMessage(`成功删除 ${successCount} 个关键词`)
      
      // 使用防抖机制强制重新渲染，确保DOM完全更新
      debounce(() => {
        window.dispatchEvent(new Event('resize'))
      }, 100)
      
      // 额外的状态同步检查
      debounce(() => {
        // 再次检查状态一致性
        if (selectedKeyword && deletingKeywords.has(selectedKeyword)) {
          console.warn('检测到状态不一致，强制清理选中状态')
          setSelectedKeyword('')
          setAnalysisResults(null)
          setActiveTab('overview')
        }
        
        // 清理任何可能的残留引用
        if (deletingKeywords.has(currentTaskKeyword.current)) {
          currentTaskKeyword.current = ''
        }
      }, 200)
    } catch (error) {
      console.error('批量删除失败:', error)
      setSearchMessage('批量删除失败，请稍后重试')
    } finally {
      setIsDeleting(false)
    }
  }

  // 长按处理
  const handleLongPress = (keywordName: string) => {
    if (!isEditMode) {
      setIsEditMode(true)
      setSelectedForDeletion(new Set([keywordName]))
    }
  }

  // 清理长按定时器和事件监听器
  const cleanupLongPress = (keywordName: string) => {
    const timer = longPressTimersRef.current.get(keywordName)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      longPressTimersRef.current.delete(keywordName)
    }

    if (eventListenersRef.current.mouseup) {
      document.removeEventListener('mouseup', eventListenersRef.current.mouseup)
      delete eventListenersRef.current.mouseup
    }
    if (eventListenersRef.current.touchend) {
      document.removeEventListener('touchend', eventListenersRef.current.touchend)
      delete eventListenersRef.current.touchend
    }
    if (eventListenersRef.current.touchcancel) {
      document.removeEventListener('touchcancel', eventListenersRef.current.touchcancel)
      delete eventListenersRef.current.touchcancel
    }
  }

  // 切换选择状态
  const toggleSelection = (keywordName: string) => {
    if (!isEditMode) return

    setSelectedForDeletion(prev => {
      const newSet = new Set(prev)
      if (newSet.has(keywordName)) {
        newSet.delete(keywordName)
      } else {
        newSet.add(keywordName)
      }
      return newSet
    })
  }

  // 重试失败的任务
  async function handleRetryTask(keyword: string) {
    if (!keyword || isLoading) return

    setIsLoading(true)
    setSearchMessage('正在重新提交爬取任务...')

    try {
      // 使用相同的参数重新提交任务
      const requestData = {
        keyword,
        languages: selectedLanguages,
        limits: languageLimits
      }

      const response = await fetch('/api/keywords/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (data.success) {
        setSearchMessage(`重试任务已提交! ${data.message || ''}`)
        // 清除之前的失败状态
        setTaskStatus(null)
        // 开始新的轮询
        startPolling(keyword, 3000)
      } else {
        setSearchMessage(`重试任务失败: ${data.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('重试任务失败:', error)
      setSearchMessage('重试任务失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理语言选择变化
  const handleLanguageChange = (language: string) => {
    // 使用函数式更新避免状态竞争
    setSelectedLanguages(prevLanguages => {
      if (prevLanguages.includes(language)) {
        // 移除语言
        const newLanguages = prevLanguages.filter(lang => lang !== language)

        // 同时更新限制
        setLanguageLimits((prevLimits: Record<string, number>) => {
          const newLimits: Record<string, number> = {...prevLimits}
          delete newLimits[language]
          return newLimits
        })

        return newLanguages
      } else {
        // 添加语言
        const newLanguages = [...prevLanguages, language]

        // 同时更新限制
        setLanguageLimits((prevLimits: Record<string, number>) => ({
          ...prevLimits,
          [language]: 30 // 默认每种语言30个
        }))

        return newLanguages
      }
    })
  }

  // 处理语言数量限制变化
  const handleLimitChange = (language: string, value: string) => {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue > 0) {
      setLanguageLimits((prevLimits: Record<string, number>) => ({
        ...prevLimits,
        [language]: numValue
      }))
    }
  }

  // 简化的关键词切换函数，避免DOM冲突
  const handleKeywordChange = (name: string) => {
    if (name === selectedKeyword) return; // 避免相同关键词重复加载

    console.log(`切换关键词: ${selectedKeyword} -> ${name}`)

    // 简单直接的状态更新，不使用复杂的异步操作
    setSelectedKeyword(name);
    setActiveTab('overview');
    setAnalysisResults(null);
    setSearchMessage('');

    // 查找并加载分析文件
    const file = analysisFiles.find(f => f.name === name)?.file;
    console.log(`查找分析文件: ${name} -> ${file}`)

    if (file) {
      setIsLoading(true);
      fetchAnalysisByFile(file);
    } else {
      console.warn(`未找到关键词 "${name}" 对应的分析文件`)
      setSearchMessage(`未找到关键词 "${name}" 的分析结果`)
    }
  }

  // 优化强制刷新函数
  async function forceRefreshResults(targetKeyword?: string) {
    const keyword = targetKeyword || selectedKeyword;
    if (!keyword) return false;

    setIsLoading(true);
    setSearchMessage('正在刷新分析结果...');

    try {
      // 刷新文件列表
      const res = await fetch('/api/analysis/list');
      if (!res.ok) throw new Error('获取文件列表失败');

      const filesData = await res.json();
      setAnalysisFiles(filesData);

      // 尝试多种匹配方式查找文件
      const keywordUnderscore = keyword.replace(/ /g, '_');
      const keywordFile = filesData.find((f: {name: string; file: string}) =>
        f.name === keyword ||
        f.name === keywordUnderscore ||
        f.file.includes(`analysis_${keyword}`) ||
        f.file.includes(`analysis_${keywordUnderscore}`)
      );

      if (keywordFile?.file) {
        await fetchAnalysisByFile(keywordFile.file);
        setSearchMessage('分析结果已刷新!');
        return true;
      } else {
        setSearchMessage('未找到匹配的分析文件');
        return false;
      }
    } catch (error) {
      console.error('强制刷新分析结果失败:', error);
      setSearchMessage('刷新分析结果失败，请稍后重试');
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  // 使用useState, useEffect, useRef进行状态管理
  useEffect(() => {
    // 组件挂载时加载关键词列表
    fetchKeywords();
    
    // 组件卸载时的清理函数
    return () => { 
      stopPolling()
      // 清理防抖定时器
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      // 清理所有长按定时器
      longPressTimersRef.current.forEach(timer => {
        window.clearTimeout(timer)
      })
      longPressTimersRef.current.clear()
      // 清理所有事件监听器
      if (eventListenersRef.current.mouseup) {
        document.removeEventListener('mouseup', eventListenersRef.current.mouseup)
        delete eventListenersRef.current.mouseup
      }
      if (eventListenersRef.current.touchend) {
        document.removeEventListener('touchend', eventListenersRef.current.touchend)
        delete eventListenersRef.current.touchend
      }
      if (eventListenersRef.current.touchcancel) {
        document.removeEventListener('touchcancel', eventListenersRef.current.touchcancel)
        delete eventListenersRef.current.touchcancel
      }
      // 清理状态引用
      setSelectedKeyword('')
      setAnalysisResults(null)
      setTaskStatus(null)
      setAvailableKeywords([])
      setAnalysisFiles([])
      setSelectedForDeletion(new Set())
      setIsEditMode(false)
      currentTaskKeyword.current = ''
      // 触发最后的清理事件
      window.dispatchEvent(new Event('resize'))
    };
  }, []);

  // 监听关键词列表变化，确保状态同步
  useEffect(() => {
    // 如果当前选中的关键词不在可用关键词列表中，清空选择
    if (selectedKeyword && !availableKeywords.some(kw => kw.name === selectedKeyword)) {
      console.log(`关键词 "${selectedKeyword}" 已不存在，清空选择`)
      setSelectedKeyword('')
      setAnalysisResults(null)
      setActiveTab('overview')
    }
  }, [availableKeywords, selectedKeyword]);

  // 由分析文件计算出可用的关键词名集合
  const analysisNames = useMemo<string[]>(() => analysisFiles.map(f => f.name), [analysisFiles])

  // 只展示有分析文件的关键词，避免数据不一致
  const filteredKeywords = useMemo<Keyword[]>(() => {
    return availableKeywords.filter(k => analysisNames.includes(k.name))
  }, [availableKeywords, analysisNames])

  // 如果当前选中不在分析文件列表中，清空选择
  useEffect(() => {
    if (selectedKeyword && !analysisNames.includes(selectedKeyword)) {
      setSelectedKeyword('')
      setAnalysisResults(null)
      setActiveTab('overview')
    }
  }, [selectedKeyword, analysisNames])

  // 简化的安全点击处理函数
  const safeClickHandler = (handler: (...args: any[]) => void, ...args: any[]) => {
    try {
      handler(...args)
    } catch (error: any) {
      console.warn('点击处理出错:', error)
      // 只对DOM相关错误进行特殊处理
      if (error.message?.includes('removeChild') ||
          error.message?.includes('NotFoundError')) {
        console.warn('DOM错误，尝试恢复')
      }
    }
  }



  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 通知区域 */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg max-w-sm ${
                notification.type === 'success'
                  ? 'bg-green-500 text-white'
                  : notification.type === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">{notification.message}</p>
                  {notification.keyword && (
                    <p className="text-xs opacity-90 mt-1">关键词: {notification.keyword}</p>
                  )}
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-2 text-white hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 标题区域 */}
      <Card className="glass-card bg-gradient-to-br from-purple-500/10 to-pink-500/10">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">GitHub 关键词分析</CardTitle>
          <CardDescription className="text-lg">
            探索GitHub上与特定技术关键词相关的仓库数据
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 关键词搜索区域 */}
      <Card className="glass-card bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
        <CardHeader>
          <CardTitle>关键词搜索</CardTitle>
          <CardDescription>输入技术关键词，我们将为您分析相关GitHub仓库</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow">
                <Input
                  placeholder="输入关键词，例如: React, Machine Learning..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                variant="outline"
                className="md:w-auto w-full"
              >
                {showAdvancedOptions ? '隐藏高级选项' : '显示高级选项'}
              </Button>
              <Button
                onClick={submitSearch}
                disabled={isLoading || !keyword.trim()}
                className="md:w-auto w-full"
              >
                {isLoading ? '处理中...' : '搜索并分析'}
              </Button>
            </div>

            {showAdvancedOptions && (
              <div className="mt-4 border rounded-md p-4 space-y-6">
                <h3 className="text-lg font-medium">配置爬取选项</h3>

                <div>
                  <h4 className="text-sm font-medium mb-2">选择编程语言</h4>
                  <div className="flex flex-wrap gap-2">
                    {availableLanguages.map(language => (
                      <Badge
                        key={language}
                        variant={selectedLanguages.includes(language) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleLanguageChange(language)}
                      >
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedLanguages.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">每种语言的爬取数量</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedLanguages.map(language => (
                        <div key={language} className="flex items-center space-x-2">
                          <span className="text-sm w-24">{language}:</span>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={languageLimits[language] || 30}
                            onChange={(e) => handleLimitChange(language, e.target.value)}
                            className="w-20"
                          />
                          <span className="text-sm">个项目</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">代码分析数量</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    控制爬取后分析多少个仓库的代码文件。分析越多数据越完整，但耗时越长。
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="-1"
                          max="1000"
                          value={codeAnalysisLimit === 0 ? '' : codeAnalysisLimit}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === '' || val === '0') {
                              setCodeAnalysisLimit(0)
                            } else {
                              setCodeAnalysisLimit(Math.max(-1, parseInt(val) || 100))
                            }
                          }}
                          placeholder="输入数量或0表示全部"
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">个仓库</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={codeAnalysisLimit === 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCodeAnalysisLimit(0)}
                      >
                        全部
                      </Button>
                      <Button
                        type="button"
                        variant={codeAnalysisLimit === 50 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCodeAnalysisLimit(50)}
                      >
                        50个
                      </Button>
                      <Button
                        type="button"
                        variant={codeAnalysisLimit === 100 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCodeAnalysisLimit(100)}
                      >
                        100个
                      </Button>
                      <Button
                        type="button"
                        variant={codeAnalysisLimit === -1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCodeAnalysisLimit(-1)}
                      >
                        不分析
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {codeAnalysisLimit === 0 && (
                      <span className="text-green-600">✓ 将分析所有爬取的仓库（耗时较长）</span>
                    )}
                    {codeAnalysisLimit > 0 && (
                      <span className="text-blue-600">✓ 将分析前 {codeAnalysisLimit} 个仓库（推荐）</span>
                    )}
                    {codeAnalysisLimit === -1 && (
                      <span className="text-gray-600">⊗ 不分析代码，仅获取仓库元数据（最快）</span>
                    )}
                  </div>
                </div>
              </div>
            )}



            {taskStatus && taskStatus.status !== 'completed' && (
              <div className="mt-4 border rounded-md p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">
                    任务状态:
                    <Badge className={`ml-2 ${getStatusBadgeColor(taskStatus.status)}`}>
                      {taskStatus.status === 'pending' ? '等待中' :
                       taskStatus.status === 'running' ? '运行中' :
                       taskStatus.status === 'completed' ? '已完成' : '失败'}
                    </Badge>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{taskStatus.progress}%</span>
                    {taskStatus.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetryTask(selectedKeyword)}
                        disabled={isLoading}
                        className="text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        重试
                      </Button>
                    )}
                  </div>
                </div>
                <Progress value={taskStatus.progress} className="h-2" />
                {taskStatus.message && (
                  <p className="mt-2 text-sm text-gray-500">{taskStatus.message}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 爬虫分析监控 */}
      <CrawlerMonitor className="glass-card bg-gradient-to-br from-green-500/10 to-teal-500/10" />

      {/* 已分析关键词 */}
      <Card className="glass-card bg-gradient-to-br from-amber-500/10 to-orange-500/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>已分析关键词</CardTitle>
              <CardDescription>
                {isEditMode ? '选择要删除的关键词' : '选择一个已分析的关键词查看详细数据'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allKeywords = new Set(availableKeywords.map(kw => kw.name))
                      setSelectedForDeletion(allKeywords)
                    }}
                  >
                    全选
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedForDeletion(new Set())}
                  >
                    清空
                  </Button>
                  {selectedForDeletion.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      删除选中 ({selectedForDeletion.size})
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setIsEditMode(false)
                      setSelectedForDeletion(new Set())
                    }}
                  >
                    完成
                  </Button>
                </>
              )}
              {!isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditMode(true)
                    setSelectedForDeletion(new Set())
                  }}
                >
                  编辑
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-2">
              {filteredKeywords.map((kw, index) => (
                <div key={`keyword-${kw.name}`} className="relative">
                  <Badge
                    variant={
                      isEditMode && selectedForDeletion.has(kw.name)
                        ? "destructive"
                        : selectedKeyword === kw.name
                          ? "default"
                          : "outline"
                    }
                    className={`cursor-pointer transition-all ${
                      isEditMode ? 'pr-8' : ''
                    } ${
                      isEditMode && selectedForDeletion.has(kw.name)
                        ? 'ring-2 ring-red-500'
                        : ''
                    }`}
                    onClick={() => {
                      if (isEditMode) {
                        toggleSelection(kw.name)
                      } else {
                        handleKeywordChange(kw.name)
                      }
                    }}
                    onMouseDown={() => {
                      if (!isEditMode) {
                        // 清理之前的事件监听器
                        cleanupLongPress(kw.name)
                        
                        const timer = window.setTimeout(() => {
                          handleLongPress(kw.name)
                        }, 500)
                        
                        longPressTimersRef.current.set(kw.name, timer)

                        // 创建清理函数
                        const cleanup = () => {
                          cleanupLongPress(kw.name)
                        }
                        
                        // 存储事件监听器引用
                        eventListenersRef.current.mouseup = cleanup
                        document.addEventListener('mouseup', cleanup)
                      }
                    }}
                    onTouchStart={() => {
                      if (!isEditMode) {
                        // 清理之前的事件监听器
                        cleanupLongPress(kw.name)
                        
                        const timer = window.setTimeout(() => {
                          handleLongPress(kw.name)
                        }, 500)
                        
                        longPressTimersRef.current.set(kw.name, timer)

                        // 创建清理函数
                        const cleanup = () => {
                          cleanupLongPress(kw.name)
                        }
                        
                        // 存储事件监听器引用
                        eventListenersRef.current.touchend = cleanup
                        eventListenersRef.current.touchcancel = cleanup
                        document.addEventListener('touchend', cleanup)
                        document.addEventListener('touchcancel', cleanup)
                      }
                    }}
                    onMouseEnter={() => {
                      // 鼠标悬停时如果在编辑模式且按住鼠标，则选择
                      if (isEditMode && isLongPressing) {
                        toggleSelection(kw.name)
                      }
                    }}
                  >
                    {kw.name} ({kw.count})
                  </Badge>
                  {isEditMode && (
                    <button
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setKeywordToDelete(kw.name)
                        setShowDeleteConfirm(true)
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {filteredKeywords.length === 0 && (
                <p className="text-muted-foreground">暂无分析数据，请先搜索一个关键词</p>
              )}
            </div>
        </CardContent>
      </Card>

      {filteredKeywords.length > 0 && (
        <Card className="glass-card bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <CardHeader>
            <CardTitle>分析结果</CardTitle>
            <CardDescription>选择分析主题查看结果</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* 关键词选择器 */}
              <div className="relative md:w-[320px] w-full">
                <select
                  value={analysisNames.includes(selectedKeyword) ? selectedKeyword : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value && value !== selectedKeyword) {
                      handleKeywordChange(value);
                    }
                  }}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors text-base"
                >
                  <option value="">选择分析主题</option>
                  {analysisFiles.map((item) => (
                    <option key={`option-${item.name}`} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 操作按钮组 - 美化布局和配色 */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => forceRefreshResults()}
                  disabled={isLoading || !selectedKeyword}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  刷新结果
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const file = analysisFiles.find(f => f.name === selectedKeyword)?.file
                    if (file) fetchAnalysisByFile(file)
                  }}
                  disabled={isLoading || !selectedKeyword}
                  className="border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  刷新缓存
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateCharts}
                  disabled={isRegenerating || !selectedKeyword}
                  className="border-2 border-emerald-400 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 transition-all"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                  重新生成
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowRecrawlConfirm(true)}
                  disabled={isRecrawling || !selectedKeyword || isTaskRunning}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRecrawling ? 'animate-spin' : ''}`} />
                  重新爬取
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportDialog(true)}
                  disabled={!selectedKeyword}
                  className="border-2 border-amber-400 hover:border-amber-500 hover:bg-amber-50 text-amber-700 hover:text-amber-800 transition-all"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  导出数据
                </Button>
              </div>
            </div>

            {selectedKeyword && (
              <div className="tabs-container">
                <h3 className="analysis-section-title mb-4">
                  {selectedKeyword} 关键词分析结果
                </h3>
                <Tabs key="analysis-tabs" defaultValue="overview" value={activeTab} onValueChange={(value) => {
                  React.startTransition(() => {
                    setActiveTab(value);
                  });                }} className="w-full">
                  <TabsList className="grid w-full md:w-auto grid-cols-4 mb-6">
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="repositories">项目列表</TabsTrigger>
                    <TabsTrigger value="libraries">库分析</TabsTrigger>
                    <TabsTrigger value="keywords">关键词分析</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    {analysisResults ? (
                      <div key="overview-content" className="space-y-6 py-4">
                        {/* 第一行：编程语言分布 和 仓库质量评估 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* 编程语言分布 */}
                          {analysisResults.charts && analysisResults.charts.language_distribution && (
                            <Card>
                              <CardHeader>
                                <CardTitle>编程语言分布</CardTitle>
                              </CardHeader>
                              <CardContent className="h-64">
                                  <ResponsiveContainer key="lang-container" width="100%" height="100%">
                                    <PieChart key="language-pie-chart">
                                      <Pie
                                        data={adjustPercentages(prepareLanguageData())}
                                        nameKey="name"
                                        dataKey="count"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        label={({ name, displayPercent }) => `${name}: ${displayPercent?.toFixed(2) || 0}%`}
                                      >
                                        {adjustPercentages(prepareLanguageData()).map((entry, index) => (
                                          <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                      </Pie>
                                      <Tooltip formatter={(value: any, name: string, props: any) => [`${props.payload.count} 个项目`, name]} />
                                      <Legend formatter={(value) => `${value}`} />
                                    </PieChart>
                                  </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          )}

                          {/* 仓库质量评估 - 移到右上角 */}
                          {analysisResults.repositories && (
                            <Card key="quality-assessment-card">
                              <CardHeader>
                                <CardTitle>仓库质量评估</CardTitle>
                              </CardHeader>
                              <CardContent className="h-64">
                                {prepareQualityData().length === 0 ? (
                                  <div className="flex items-center justify-center h-full text-gray-500">
                                    <div className="text-center">
                                      <div className="text-4xl mb-2">⭐</div>
                                      <div>暂无质量数据</div>
                                      <div className="text-sm mt-1">无法评估仓库质量</div>
                                    </div>
                                  </div>
                                ) : (
                                  <ResponsiveContainer key="quality-container" width="100%" height="100%">
                                    <PieChart key="quality-pie-chart">
                                      <Pie
                                        data={prepareQualityData()}
                                        nameKey="name"
                                        dataKey="count"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        label={({ name, count }) => `${name}: ${count}`}
                                      >
                                        {prepareQualityData().map((entry, index) => (
                                          <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                      </Pie>
                                      <Tooltip formatter={(value: any, name: string) => [value, '仓库数量']} />
                                      <Legend />
                                    </PieChart>
                                  </ResponsiveContainer>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </div>

                        {/* 第二行：AI智能总结 - 全宽 */}
                        {analysisResults.repositories && (
                          <Card className="col-span-1">
                            <CardHeader className="flex flex-row items-center justify-between">
                              <CardTitle>AI智能总结</CardTitle>
                              <Button
                                onClick={generateAISummary}
                                disabled={isGeneratingSummary}
                                size="sm"
                                variant="outline"
                              >
                                {isGeneratingSummary ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                    生成中...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    生成总结
                                  </>
                                )}
                              </Button>
                            </CardHeader>
                            <CardContent className="min-h-[16rem] overflow-y-auto">
                              {aiSummary ? (
                                <div className="prose prose-sm max-w-none">
                                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {aiSummary}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-64 text-gray-500">
                                  <div className="text-center">
                                    <div className="text-4xl mb-2">🤖</div>
                                    <div>AI智能分析</div>
                                    <div className="text-sm mt-1">点击"生成总结"获取AI分析报告</div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-gray-500">
                          {isLoading ? '加载分析结果中...' : '没有找到分析结果或数据正在处理中'}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="repositories" className="space-y-4">
                    <div key="repositories-content">
                      {isLoading ? (
                        <div className="py-8 text-center">
                          <div className="flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                            <span>加载仓库数据中...</span>
                          </div>
                        </div>
                      ) : analysisResults && analysisResults.repositories && analysisResults.repositories.length > 0 ? (
                        <RepositoryList
                          repositories={analysisResults.repositories}
                          keyword={selectedKeyword}
                        />
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-gray-500">
                            没有找到仓库数据或数据正在处理中
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="libraries" className="space-y-4">
                    <div key="libraries-content">
                      {analysisResults ? (
                        <div className="grid grid-cols-1 gap-6">
                          {/* 增强库分析组件 */}
                          {analysisResults && selectedKeyword && (
                            <EnhancedLibraryAnalysis
                              keyword={selectedKeyword}
                              title="常用库/包分析"
                              libraryData={analysisResults.charts?.imported_libraries?.data || {}}
                              trendsData={analysisResults.trends || {}}
                            />
                          )}

                          {/* 趋势计算方法解释 */}
                          <Card key="trend-calculation-explanation">
                            <CardHeader>
                              <CardTitle>趋势计算方法说明</CardTitle>
                              <CardDescription>了解库分析中趋势指标的计算原理</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                                  <h4 className="font-semibold text-green-800 mb-2">🔥 热门趋势 (上升)</h4>
                                  <p className="text-sm text-green-700">
                                    基于以下指标综合评估：使用频率 &gt; 15次、GitHub星标增长率 &gt; 10%、
                                    近期提交活跃度高、社区讨论热度上升
                                  </p>
                                </div>

                                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                  <h4 className="font-semibold text-blue-800 mb-2">📊 常用趋势 (稳定)</h4>
                                  <p className="text-sm text-blue-700">
                                    成熟稳定的库：使用频率 5-15次、星标增长平稳、
                                    文档完善、版本更新规律、企业级应用广泛
                                  </p>
                                </div>

                                <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                                  <h4 className="font-semibold text-orange-800 mb-2">📉 冷门趋势 (下降)</h4>
                                  <p className="text-sm text-orange-700">
                                    使用频率 &lt; 5次、星标增长缓慢或负增长、
                                    维护活跃度低、可能被新技术替代
                                  </p>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <h4 className="font-semibold text-gray-800 mb-2">🔍 计算依据</h4>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• <strong>使用频率</strong>：在分析的仓库中被导入的次数</li>
                                    <li>• <strong>涉及仓库数</strong>：使用该库的不同仓库数量</li>
                                    <li>• <strong>星标趋势</strong>：GitHub星标的增长变化率</li>
                                    <li>• <strong>社区活跃度</strong>：提交频率、Issue讨论、PR活动</li>
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-gray-500">
                            {isLoading ? '加载库分析数据中...' : '没有找到库分析数据或数据正在处理中'}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="keywords" className="space-y-4">
                    <div key="keywords-content">
                      {analysisResults ? (
                        <div className="grid grid-cols-1 gap-6 py-4">
                        {/* 标签分析组件 */}
                        {analysisResults.charts && (
                          <Card>
                            <CardHeader>
                              <CardTitle>标签分析</CardTitle>
                              <CardDescription>
                                项目中使用的标签统计
                                {!analysisResults.charts.tag_analysis?.data ||
                                 Object.keys(analysisResults.charts.tag_analysis.data).length === 0 ?
                                  ' (已自动从仓库标签生成)' : ''}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {analysisResults.charts.tag_analysis?.data &&
                               Object.keys(analysisResults.charts.tag_analysis.data).length > 0 ? (
                                <TagAnalysis data={analysisResults.charts.tag_analysis.data} />
                              ) : (
                                <div className="py-4 text-center">
                                  <p className="text-gray-500">
                                    没有找到标签数据或正在处理中...
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* 关键词云组件 */}
                        {analysisResults.charts && (
                          <Card>
                            <CardHeader>
                              <CardTitle>描述关键词分析</CardTitle>
                              <CardDescription>
                                项目描述中出现的关键词统计
                                {!analysisResults.charts.description_keywords?.data ||
                                 Object.keys(analysisResults.charts.description_keywords.data).length === 0 ?
                                  ' (已自动从仓库描述生成)' : ''}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {analysisResults.charts.description_keywords?.data &&
                               Object.keys(analysisResults.charts.description_keywords.data).length > 0 ? (
                                <KeywordCloud data={analysisResults.charts.description_keywords.data} />
                              ) : (
                                <div className="py-4 text-center">
                                  <p className="text-gray-500">
                                    没有找到关键词数据或正在处理中...
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-gray-500">
                            {isLoading ? '加载关键词分析数据中...' : '没有找到关键词分析数据或数据正在处理中'}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {keywordToDelete ? (
                <>确定要删除关键词 "<strong>{keywordToDelete}</strong>" 吗？</>
              ) : (
                <>确定要删除选中的 <strong>{selectedForDeletion.size}</strong> 个关键词吗？</>
              )}
              <br />
              <span className="text-red-600">此操作将删除所有相关的分析数据和文件，且无法撤销。</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false)
                setKeywordToDelete(null)
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (keywordToDelete) {
                  await handleDeleteKeyword(keywordToDelete)
                  setKeywordToDelete(null)
                } else {
                  await handleBatchDelete()
                }
                setShowDeleteConfirm(false)
              }}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重新爬取确认对话框 */}
      <Dialog open={showRecrawlConfirm} onOpenChange={(open) => {
        setShowRecrawlConfirm(open)
        if (open) {
          // 打开对话框时初始化参数
          const cachedParams = crawlParamsCache[selectedKeyword]
          setRecrawlLanguages(cachedParams?.languages || selectedLanguages)
          setRecrawlLimits(cachedParams?.limits || languageLimits)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-600" />
              重新爬取关键词
            </DialogTitle>
            <DialogDescription>
              关键词: "<strong className="text-purple-600">{selectedKeyword}</strong>"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* 语言选择 */}
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <span>📋</span>
                <span>选择编程语言</span>
              </h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {availableLanguages.map(language => (
                  <Badge
                    key={language}
                    variant={recrawlLanguages.includes(language) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      recrawlLanguages.includes(language)
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'hover:bg-blue-100'
                    }`}
                    onClick={() => {
                      if (recrawlLanguages.includes(language)) {
                        setRecrawlLanguages(prev => prev.filter(lang => lang !== language))
                        setRecrawlLimits(prev => {
                          const newLimits = {...prev}
                          delete newLimits[language]
                          return newLimits
                        })
                      } else {
                        setRecrawlLanguages(prev => [...prev, language])
                        setRecrawlLimits(prev => ({
                          ...prev,
                          [language]: 30
                        }))
                      }
                    }}
                  >
                    {language}
                  </Badge>
                ))}
              </div>
              {crawlParamsCache[selectedKeyword] && (
                <p className="text-xs text-blue-600">
                  ℹ️ 已自动加载首次爬取时的语言设置
                </p>
              )}
            </div>

            {/* 数量设置 */}
            {recrawlLanguages.length > 0 && (
              <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <span>🔢</span>
                  <span>设置爬取数量</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {recrawlLanguages.map(language => (
                    <div key={language} className="flex items-center space-x-2 bg-white p-2 rounded border">
                      <span className="text-sm font-medium w-20">{language}:</span>
                      <Input
                        type="number"
                        min="1"
                        max="200"
                        value={recrawlLimits[language] || 30}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10)
                          if (!isNaN(value) && value > 0) {
                            setRecrawlLimits(prev => ({
                              ...prev,
                              [language]: value
                            }))
                          }
                        }}
                        className="w-20 h-8 text-center"
                      />
                      <span className="text-xs text-gray-500">个</span>
                    </div>
                  ))}
                </div>
                {crawlParamsCache[selectedKeyword] && (
                  <p className="text-xs text-green-600 mt-2">
                    ℹ️ 已自动加载首次爬取时的数量设置
                  </p>
                )}
              </div>
            )}

            {/* 注意事项 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 mb-2">⚠️ 注意事项</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• 重新爬取将更新所有仓库数据</li>
                <li>• 会重新分析代码文件和导入的库</li>
                <li>• 过程可能需要几分钟时间</li>
                <li>• 完成后会自动刷新分析结果</li>
                <li>• 总计将爬取 <strong>{Object.values(recrawlLimits).reduce((sum, count) => sum + count, 0)}</strong> 个项目</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRecrawlConfirm(false)}
              disabled={isRecrawling}
            >
              取消
            </Button>
            <Button
              variant="default"
              onClick={recrawlRepository}
              disabled={isRecrawling || recrawlLanguages.length === 0}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              {isRecrawling ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  爬取中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  确认重新爬取
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导出数据对话框 */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出分析数据
            </DialogTitle>
            <DialogDescription>
              关键词: "<strong className="text-amber-600">{selectedKeyword}</strong>"
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* 导出选项 */}
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <span>⚙️</span>
                <span>导出选项</span>
              </h4>
              
              {/* 包含文件详情选项 */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeFiles}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      includeFiles: e.target.checked
                    }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-blue-900">包含文件级别详情</span>
                </label>
                {exportOptions.includeFiles && (
                  <p className="text-xs text-blue-600 ml-6">
                    ℹ️ 将包含每个库的具体使用文件、路径、所属仓库等详细信息
                  </p>
                )}
              </div>
            </div>

            {/* 特定库导出 */}
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <span>📦</span>
                <span>特定库导出（可选）</span>
              </h4>
              
              <Input
                type="text"
                placeholder="输入库名称，如: requests, react, numpy（留空则导出所有）"
                value={exportOptions.specificLibrary}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  specificLibrary: e.target.value.trim()
                }))}
                className="w-full"
              />
              
              {exportOptions.specificLibrary && (
                <p className="text-xs text-green-600 mt-2">
                  ℹ️ 将只导出与 "{exportOptions.specificLibrary}" 相关的数据
                </p>
              )}
            </div>

            {/* 导出格式说明 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 mb-2">📋 导出内容说明</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• <strong>基础数据</strong>：关键词、仓库数量、分析日期</li>
                <li>• <strong>语言分布</strong>：各编程语言的使用情况统计</li>
                <li>• <strong>库分析</strong>：导入的库及其使用频率</li>
                {exportOptions.includeFiles && (
                  <li className="text-green-700">• <strong>文件详情</strong>：每个库的具体文件路径和仓库信息</li>
                )}
                {exportOptions.specificLibrary && (
                  <li className="text-green-700">• <strong>特定库</strong>：仅包含 "{exportOptions.specificLibrary}" 的相关数据</li>
                )}
                <li>• <strong>格式</strong>：JSON格式，便于程序化处理和分析</li>
              </ul>
            </div>

            {/* 数据预览 */}
            {analysisResults && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-2">📊 数据概览</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white p-2 rounded border">
                    <span className="text-gray-600">仓库数量：</span>
                    <span className="font-semibold">{analysisResults.repositories?.length || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="text-gray-600">编程语言：</span>
                    <span className="font-semibold">
                      {Object.keys(analysisResults.charts?.language_distribution?.data || {}).length}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="text-gray-600">导入的库：</span>
                    <span className="font-semibold">
                      {Object.keys(analysisResults.charts?.imported_libraries?.data || {}).length}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="text-gray-600">文件大小：</span>
                    <span className="font-semibold text-gray-500">
                      {exportOptions.includeFiles ? '较大' : '适中'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowExportDialog(false)
                setExportOptions({
                  includeFiles: false,
                  specificLibrary: '',
                  format: 'json'
                })
              }}
              disabled={isExporting}
            >
              取消
            </Button>
            <Button
              variant="default"
              onClick={handleExport}
              disabled={isExporting}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  导出中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  确认导出
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

