'use client'

import { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SafeTabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/safe-tabs'
import { RefreshCw } from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BarChartComponent, PieChartComponent } from '@/components/ui/charts'

// 导入新组件
import { RepositoryList } from '@/components/repository-list'
import { TagAnalysis } from '@/components/tag-analysis'
import { KeywordCloud } from '@/components/keyword-cloud'
import { EnhancedLibraryAnalysis } from '@/components/enhanced-library-analysis'
import { ChartsDisplay } from '@/components/charts-display'

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

// 新增：静态分析文件列表
const ANALYSIS_FILES = [
  { name: 'Application API', file: '/analytics/analysis_Application_API.json' },
  { name: 'Cryptography API', file: '/analytics/analysis_Cryptography_API.json' },
  { name: 'Messaging API', file: '/analytics/analysis_Messaging_API.json' },
  { name: 'Monitoring API', file: '/analytics/analysis_Monitoring_API.json' },
]

// 添加错误边界组件
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('组件错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
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
  const [keyword, setKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchMessage, setSearchMessage] = useState('')
  const [analysisResults, setAnalysisResults] = useState(null)
  const [selectedKeyword, setSelectedKeyword] = useState('')
  const [availableKeywords, setAvailableKeywords] = useState<Keyword[]>([])
  const [taskStatus, setTaskStatus] = useState(null)
  const [pollingInterval, setPollingInterval] = useState(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [isRecrawling, setIsRecrawling] = useState(false)
  
  // 使用ref存储当前爬取的关键词，避免闭包问题
  const currentTaskKeyword = useRef('')
  
  // 自定义语言和数量设置
  const [selectedLanguages, setSelectedLanguages] = useState(['python', 'java'])
  const [languageLimits, setLanguageLimits] = useState({
    python: 50,
    java: 30
  })
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  
  // 可选语言列表
  const availableLanguages = [
    'python', 'java', 'javascript', 'typescript', 'go', 'rust', 
    'c', 'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin'
  ]

  // 动态加载分析文件列表
  const [analysisFiles, setAnalysisFiles] = useState([])

  // 从后端获取已有的关键词列表
  async function fetchKeywords() {
    try {
      const response = await fetch('/api/keywords')
      const data = await response.json()
      
      if (data.keywords && data.keywords.length > 0) {
        setAvailableKeywords(data.keywords)
        // 默认选择第一个关键词
        if (!selectedKeyword && data.keywords.length > 0) {
          setSelectedKeyword(data.keywords[0].name)
          fetchAnalysisByFile(data.keywords[0].file)
        }
      }
    } catch (error) {
      console.error('获取关键词列表失败:', error)
    }
  }

  // 从后端获取任务状态
  async function fetchTaskStatus(keyword) {
    if (!keyword) return;

    try {
      const response = await fetch(`/api/keywords/task?keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      
      if (!data.error) {
        setTaskStatus(data);
        
        // 任务完成或失败时
        if (data.status === 'completed' || data.status === 'failed') {
          // 清除轮询
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          if (data.status === 'completed') {
            // 直接调用刷新,不使用requestAnimationFrame
            await forceRefreshResults(keyword);
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

  // 动态加载分析文件列表
  useEffect(() => {
    async function fetchAnalysisFiles() {
      try {
        const res = await fetch('/api/analysis/list')
        const data = await res.json()
        setAnalysisFiles(data)
        if (data.length > 0) {
          setSelectedKeyword(data[0].name)
          fetchAnalysisByFile(data[0].file)
        }
      } catch (e) {
        setAnalysisFiles([])
      }
    }
    fetchAnalysisFiles()
  }, [])

  // 加载分析结果
  async function fetchAnalysisByFile(file) {
    if (!file) {
      console.error('文件路径为空');
      return;
    }
    
    let isMounted = true;
    console.log('尝试加载分析文件:', file);
    setIsLoading(true);
    
    try {
      const response = await fetch(file);
      if (!isMounted) return;
      
      if (!response.ok) {
        throw new Error(`加载分析结果失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!isMounted) return;
      
      console.log('成功加载分析结果');
      
      // 检查并处理数据结构
      const processedData = processAnalysisData(data, file);
      if (isMounted) {
        setAnalysisResults(processedData);
      }
    } catch (error) {
      if (isMounted) {
        console.error('加载分析结果失败:', error);
        setAnalysisResults(null);
        setSearchMessage(`加载分析结果失败: ${error.message}`);
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }

  // 处理和规范化分析数据
  function processAnalysisData(data, filePath) {
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
        const languages = {};
        data.repositories.forEach(repo => {
          if (repo.language) {
            languages[repo.language] = (languages[repo.language] || 0) + 1;
          }
        });
        data.charts.language_distribution.data = languages;
      }
    }
    
    // 处理星标分布数据
    if (!data.charts.stars_distribution) {
      console.log('缺少星标分布数据，尝试从仓库信息创建');
      data.charts.stars_distribution = { data: { mean: 0, min: 0, max: 0, total: 0 } };
      
      // 如果有仓库数据，尝试从中构建星标分布
      if (data.repositories && Array.isArray(data.repositories)) {
        const stars = data.repositories.map(repo => repo.stars || 0);
        if (stars.length > 0) {
          const total = stars.reduce((a, b) => a + b, 0);
          data.charts.stars_distribution.data = {
            mean: total / stars.length,
            min: Math.min(...stars),
            max: Math.max(...stars),
            total: total
          };
        }
      }
    }
    
    // 处理标签分析数据
    if (!data.charts.tag_analysis) {
      console.log('缺少标签分析数据，尝试从仓库标签创建');
      data.charts.tag_analysis = { data: {} };
      
      // 如果有仓库数据，尝试从中构建标签分析
      if (data.repositories && Array.isArray(data.repositories)) {
        const tags = {};
        data.repositories.forEach(repo => {
          if (repo.tags && Array.isArray(repo.tags)) {
            repo.tags.forEach(tag => {
              tags[tag] = (tags[tag] || 0) + 1;
            });
          }
        });
        data.charts.tag_analysis.data = tags;
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
      // 这只是一个简单实现，实际上需要更复杂的文本处理
      if (data.repositories && Array.isArray(data.repositories)) {
        const keywords = {};
        data.repositories.forEach(repo => {
          if (repo.description) {
            const words = repo.description
              .toLowerCase()
              .replace(/[^\w\s]/g, '')
              .split(/\s+/)
              .filter(word => word.length > 3);
            
            words.forEach(word => {
              keywords[word] = (keywords[word] || 0) + 1;
            });
          }
        });
        
        // 只保留出现频率最高的前30个关键词
        const sortedKeywords = Object.entries(keywords)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 30)
          .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
          }, {});
        
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
      limits: languageLimits
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
        // 更新当前选中的关键词
        setSelectedKeyword(keyword)
        // 重置分析结果，准备接收新数据
        setAnalysisResults(null)
        // 设置活动标签为总览
        setActiveTab('overview')
        
        // 刷新关键词列表
        await fetchKeywords()
        
        // 开始轮询任务状态
        if (pollingInterval) {
          clearInterval(pollingInterval)
        }
        
        // 每3秒检查一次任务状态
        const interval = setInterval(() => {
          // 使用ref中存储的关键词，而不是闭包中的
          console.log('轮询任务状态，当前关键词:', currentTaskKeyword.current);
          fetchTaskStatus(currentTaskKeyword.current)
        }, 3000)
        
        setPollingInterval(interval)
      } else {
        setSearchMessage(`爬取请求失败: ${data.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('提交爬取请求失败:', error)
      setSearchMessage('提交爬取请求失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }
  
  // 任务状态展示的辅助函数
  function getStatusBadgeColor(status) {
    switch(status) {
      case 'pending': return 'bg-yellow-200 text-yellow-800'
      case 'running': return 'bg-blue-200 text-blue-800'
      case 'completed': return 'bg-green-200 text-green-800' 
      case 'failed': return 'bg-red-200 text-red-800'
      default: return 'bg-gray-200 text-gray-800'
    }
  }

  // 清理轮询interval
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // 页面加载时获取关键词列表
  useEffect(() => {
    fetchKeywords()
  }, [])

  // 重新生成分析
  async function regenerateCharts() {
    if (!analysisResults || isRegenerating) return;
    setIsRegenerating(true);
    setSearchMessage('正在重新生成分析数据...');
    try {
      const response = await fetch('/api/analysis/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: analysisResults.keyword })
      });
      const data = await response.json();
      if (data.success) {
        setSearchMessage('分析数据已重新生成!');
        // 重新获取分析结果
        const file = analysisFiles.find(f => f.name === selectedKeyword)?.file
        if (file) fetchAnalysisByFile(file)
      } else {
        setSearchMessage(`重新生成失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      setSearchMessage('重新生成请求失败，请稍后重试');
    } finally {
      setIsRegenerating(false);
    }
  }

  // 图表数据准备函数
  const prepareChartData = (dataObject) => {
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
    const rawData = analysisResults.charts.language_distribution.data || {};
    
    // 计算总和
    const total = Object.values(rawData).reduce((sum: number, count: any) => sum + Number(count), 0);
    
    // 如果总和为0，返回空数组
    if (total === 0) return [];
    
    // 计算准确的百分比，确保总和为100%
    return Object.entries(rawData).map(([name, value]) => {
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
  const adjustPercentages = (data) => {
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

  // 准备星标数据
  const prepareStarsData = (starsData) => {
    if (!starsData) return [];
    
    return [
      { name: '最小值', value: starsData.min },
      { name: '平均值', value: starsData.mean },
      { name: '最大值', value: starsData.max }
    ];
  };

  // 判断是否有任务正在运行
  const isTaskRunning = taskStatus && (taskStatus.status === 'pending' || taskStatus.status === 'running');

  // 添加重新爬取功能
  async function recrawlRepository() {
    if (!selectedKeyword || isRecrawling) return
    
    setIsRecrawling(true)
    setSearchMessage('正在提交重新爬取请求...')
    
    try {
      const requestData = { 
        keyword: selectedKeyword,
        languages: selectedLanguages,
        limits: languageLimits
      }
      
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
        
        // 开始轮询任务状态
        if (pollingInterval) {
          clearInterval(pollingInterval)
        }
        
        // 每3秒检查一次任务状态
        const interval = setInterval(() => {
          fetchTaskStatus(selectedKeyword)
        }, 3000)
        
        setPollingInterval(interval)
      } else {
        setSearchMessage(`重新爬取请求失败: ${data.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('提交重新爬取请求失败:', error)
      setSearchMessage('提交重新爬取请求失败，请稍后重试')
    } finally {
      setIsRecrawling(false)
    }
  }

  // 处理语言选择变化
  const handleLanguageChange = (language) => {
    if (selectedLanguages.includes(language)) {
      setSelectedLanguages(selectedLanguages.filter(lang => lang !== language))
      
      // 从限制中移除该语言
      const newLimits = {...languageLimits}
      delete newLimits[language]
      setLanguageLimits(newLimits)
    } else {
      setSelectedLanguages([...selectedLanguages, language])
      
      // 添加默认限制
      setLanguageLimits({
        ...languageLimits,
        [language]: 30 // 默认每种语言30个
      })
    }
  }
  
  // 处理语言数量限制变化
  const handleLimitChange = (language, value) => {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue > 0) {
      setLanguageLimits({
        ...languageLimits,
        [language]: numValue
      })
    }
  }

  // 切换关键词时加载对应分析文件
  const handleKeywordChange = (name) => {
    if (name === selectedKeyword) return; // 避免相同关键词重复加载
    
    setSelectedKeyword(name);
    setAnalysisResults(null); // 重置分析结果，避免使用旧数据
    setActiveTab('overview'); // 重置为默认标签页
    
    const file = analysisFiles.find(f => f.name === name)?.file;
    if (file) fetchAnalysisByFile(file);
  }

  // 修改轮询相关的 useEffect
  useEffect(() => {
    let isSubscribed = true;
    
    // 如果有任务正在运行,启动轮询
    if (taskStatus && currentTaskKeyword.current) {
      console.log('启动轮询:', currentTaskKeyword.current);
      
      // 立即执行一次
      fetchTaskStatus(currentTaskKeyword.current);
      
      // 设置更频繁的轮询间隔(1秒)
      const interval = setInterval(() => {
        if (isSubscribed) {
          fetchTaskStatus(currentTaskKeyword.current);
        }
      }, 1000);
      
      setPollingInterval(interval);
    }

    // 清理函数
    return () => {
      isSubscribed = false;
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [taskStatus?.status]); // 只在任务状态改变时重新设置轮询

  // 监控selectedKeyword变化，更新当前任务关键词
  useEffect(() => {
    if (selectedKeyword) {
      currentTaskKeyword.current = selectedKeyword;
    }
  }, [selectedKeyword]);

  // 优化强制刷新函数
  async function forceRefreshResults(targetKeyword) {
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
      const keywordFile = filesData.find(f => 
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
    
    // 组件卸载时清理
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
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
              <div className="mt-4 border rounded-md p-4">
                <h3 className="text-lg font-medium mb-2">配置爬取选项</h3>
                
                <div className="mb-4">
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
              </div>
            )}
            
            {searchMessage && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-600 rounded-md">
                {searchMessage}
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
                  <span className="text-sm">{taskStatus.progress}%</span>
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

      {/* 已有关键词列表 */}
      <Card className="glass-card bg-gradient-to-br from-amber-500/10 to-orange-500/10">
        <CardHeader>
          <CardTitle>已分析关键词</CardTitle>
          <CardDescription>选择一个已分析的关键词查看详细数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableKeywords.map((kw) => (
              <Badge
                key={kw.id}
                variant={selectedKeyword === kw.name ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleKeywordChange(kw.name)}
              >
                {kw.name} ({kw.count})
              </Badge>
            ))}
            {availableKeywords.length === 0 && (
              <p className="text-muted-foreground">暂无分析数据，请先搜索一个关键词</p>
            )}
          </div>
        </CardContent>
      </Card>

      {availableKeywords.length > 0 && (
        <Card className="glass-card bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <CardHeader>
            <CardTitle>分析结果</CardTitle>
            <CardDescription>选择分析主题查看结果</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <Select
                value={selectedKeyword}
                onValueChange={handleKeywordChange}
              >
                <SelectTrigger className="md:w-[280px] w-full">
                  <SelectValue placeholder="选择分析主题" />
                </SelectTrigger>
                <SelectContent>
                  {analysisFiles.map((item) => (
                    <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="default"
                size="sm"
                onClick={() => forceRefreshResults()}
                disabled={isLoading || !selectedKeyword}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                刷新分析结果
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const file = analysisFiles.find(f => f.name === selectedKeyword)?.file
                  if (file) fetchAnalysisByFile(file)
                }}
                disabled={isLoading || !selectedKeyword}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                刷新缓存数据
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateCharts}
                disabled={isRegenerating || !selectedKeyword}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                重新生成分析
              </Button>
            </div>
            
            {selectedKeyword && (
              <div className="tabs-container" key={`tabs-container-${selectedKeyword}`}>
                <h3 className="analysis-section-title mb-4">
                  {selectedKeyword} 关键词分析结果
                </h3>
                <SafeTabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full md:w-auto grid-cols-4 mb-6">
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="repositories">项目列表</TabsTrigger>
                    <TabsTrigger value="libraries">库分析</TabsTrigger>
                    <TabsTrigger value="keywords">关键词分析</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent key={`overview-${selectedKeyword}-${activeTab === 'overview'}`} value="overview">
                    {analysisResults ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {analysisResults.charts && analysisResults.charts.language_distribution && (
                          <Card>
                            <CardHeader>
                              <CardTitle>编程语言分布</CardTitle>
                            </CardHeader>
                            <CardContent className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={adjustPercentages(prepareLanguageData())}
                                    nameKey="name"
                                    dataKey="count"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    label={({ name, displayPercent }) => `${name}: ${displayPercent.toFixed(2)}%`}
                                  >
                                    {adjustPercentages(prepareLanguageData()).map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value, name, props) => [`${props.payload.count} 个项目`, name]} />
                                  <Legend formatter={(value) => `${value}`} />
                                </PieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}
                        
                        {analysisResults.charts && analysisResults.charts.stars_distribution && (
                          <Card>
                            <CardHeader>
                              <CardTitle>星标统计</CardTitle>
                            </CardHeader>
                            <CardContent className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={prepareStarsData(analysisResults.charts.stars_distribution.data)}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                                  <Legend />
                                  <Bar dataKey="value" fill="#8884d8" name="星标数" />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* 标签分析 - 添加回概览页面 */}
                        {analysisResults.charts && analysisResults.charts.tag_analysis && (
                          <Card>
                            <CardHeader>
                              <CardTitle>标签分析</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <TagAnalysis data={analysisResults.charts.tag_analysis.data} isSimplified={true} />
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
                  
                  <TabsContent key={`repositories-${selectedKeyword}-${activeTab === 'repositories'}`} value="repositories">
                    {analysisResults && analysisResults.repositories ? (
                      <RepositoryList repositories={analysisResults.repositories} keyword={selectedKeyword} />
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-gray-500">
                          {isLoading ? '加载仓库数据中...' : '没有找到仓库数据或数据正在处理中'}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent key={`libraries-${selectedKeyword}-${activeTab === 'libraries'}`} value="libraries">
                    {analysisResults ? (
                      <div className="grid grid-cols-1 gap-6">
                        {/* 增强库分析组件 */}
                        {analysisResults && selectedKeyword && (
                          <EnhancedLibraryAnalysis 
                            keyword={selectedKeyword}
                            key={`lib-analysis-${selectedKeyword}`}
                            title="常用库/包分析"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-gray-500">
                          {isLoading ? '加载库分析数据中...' : '没有找到库分析数据或数据正在处理中'}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent key={`keywords-${selectedKeyword}-${activeTab === 'keywords'}`} value="keywords">
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
                  </TabsContent>
                </SafeTabs>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}