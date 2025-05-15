'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Navbar } from '@/components/navbar'
import Image from 'next/image'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

// 颜色配置
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', 
  '#FF6B6B', '#4BC0C0', '#FF9F40', '#9966FF', '#FF6699',
  '#36A2EB', '#FF6384', '#4BC0C0', '#FF9F40', '#9966FF'
];

// 关键词搜索和分析页面
export default function KeywordsPage() {
  const [keyword, setKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchMessage, setSearchMessage] = useState('')
  const [analysisResults, setAnalysisResults] = useState(null)
  const [selectedKeyword, setSelectedKeyword] = useState('')
  const [availableKeywords, setAvailableKeywords] = useState([])
  const [taskStatus, setTaskStatus] = useState(null)
  const [pollingInterval, setPollingInterval] = useState(null)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // 从后端获取已有的关键词列表
  async function fetchKeywords() {
    try {
      const response = await fetch('/api/keywords')
      const data = await response.json()
      
      if (data.keywords && data.keywords.length > 0) {
        setAvailableKeywords(data.keywords)
        // 默认选择第一个关键词
        if (!selectedKeyword && data.keywords.length > 0) {
          setSelectedKeyword(data.keywords[0])
          fetchAnalysis(data.keywords[0])
        }
      }
    } catch (error) {
      console.error('获取关键词列表失败:', error)
    }
  }

  // 从后端获取任务状态
  async function fetchTaskStatus(keyword) {
    if (!keyword) return

    try {
      const response = await fetch(`/api/keywords/task?keyword=${encodeURIComponent(keyword)}`)
      const data = await response.json()
      
      if (!data.error) {
        setTaskStatus(data)
        
        // 如果任务完成或失败，停止轮询
        if (data.status === 'completed' || data.status === 'failed') {
          if (pollingInterval) {
            clearInterval(pollingInterval)
            setPollingInterval(null)
          }
          
          // 如果完成了，获取分析结果
          if (data.status === 'completed') {
            fetchAnalysis(keyword)
          }
        }
      }
    } catch (error) {
      console.error('获取任务状态失败:', error)
    }
  }

  // 从后端获取特定关键词的分析结果
  async function fetchAnalysis(keyword) {
    if (!keyword) return

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/analysis?keyword=${encodeURIComponent(keyword)}`)
      const data = await response.json()
      
      if (data.error) {
        setAnalysisResults(null)
        setSearchMessage(`获取分析结果失败: ${data.error}`)
      } else {
        setAnalysisResults(data)
        setSearchMessage('')
      }
    } catch (error) {
      console.error('获取分析结果失败:', error)
      setAnalysisResults(null)
      setSearchMessage('获取分析结果失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 提交关键词搜索请求
  async function submitSearch() {
    if (!keyword.trim()) {
      setSearchMessage('请输入关键词')
      return
    }

    setIsLoading(true)
    setSearchMessage('正在提交爬取请求，这可能需要一些时间...')
    
    try {
      const response = await fetch('/api/keywords/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSearchMessage(`爬取请求已提交! ${data.message || ''}`)
        setSelectedKeyword(keyword)
        
        // 刷新关键词列表
        fetchKeywords()
        
        // 开始轮询任务状态
        if (pollingInterval) {
          clearInterval(pollingInterval)
        }
        
        // 每3秒检查一次任务状态
        const interval = setInterval(() => {
          fetchTaskStatus(keyword)
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

  // 添加一个重新生成图表的函数
  async function regenerateCharts() {
    if (!selectedKeyword || isRegenerating) return;
    
    setIsRegenerating(true);
    setSearchMessage('正在重新生成分析数据...');
    
    try {
      const response = await fetch(`/api/regenerate?keyword=${encodeURIComponent(selectedKeyword)}`);
      const data = await response.json();
      
      if (data.error) {
        setSearchMessage(`重新生成分析数据失败: ${data.error}`);
      } else {
        setSearchMessage('分析数据已更新');
        // 重新获取分析结果
        fetchAnalysis(selectedKeyword);
      }
    } catch (error) {
      console.error('重新生成分析数据出错:', error);
      setSearchMessage('重新生成分析数据时发生错误，请稍后重试');
    } finally {
      setIsRegenerating(false);
    }
  }

  // 将对象数据转换为recharts需要的格式
  const prepareChartData = (dataObject) => {
    if (!dataObject) return [];
    return Object.entries(dataObject).map(([name, value]) => ({
      name,
      value: typeof value === 'number' ? value : 0
    }));
  };

  // 将星标数据转换为柱状图数据
  const prepareStarsData = (starsData) => {
    if (!starsData) return [];
    return [
      { name: '最小值', value: starsData.min },
      { name: '平均值', value: Math.round(starsData.mean) },
      { name: '最大值', value: starsData.max }
    ];
  };

  return (
    <main className="container mx-auto py-6">
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-2">GitHub 关键词搜索与分析</h1>
        <p className="text-muted-foreground mb-6">根据关键词搜索并分析GitHub上的开源项目</p>
        
        <Navbar />
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* 关键词搜索 */}
          <Card>
            <CardHeader>
              <CardTitle>关键词搜索</CardTitle>
              <CardDescription>
                输入关键词，我们将自动抓取50个Python项目和30个Java项目
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <Input
                  placeholder="输入关键词"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                <Button 
                  onClick={submitSearch} 
                  disabled={isLoading || !keyword.trim()}
                >
                  {isLoading ? '处理中...' : '搜索'}
                </Button>
                {searchMessage && (
                  <p className="text-sm text-muted-foreground mt-2">{searchMessage}</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* 已有关键词选择 */}
          <Card>
            <CardHeader>
              <CardTitle>已有关键词</CardTitle>
              <CardDescription>
                查看已抓取关键词的分析结果
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <Select 
                  value={selectedKeyword} 
                  onValueChange={(value) => {
                    setSelectedKeyword(value)
                    fetchAnalysis(value)
                    fetchTaskStatus(value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择关键词" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableKeywords.map((kw) => (
                      <SelectItem key={kw} value={kw}>
                        {kw}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline"
                  onClick={() => fetchKeywords()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" /> 刷新关键词列表
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* 分析概览 */}
          <Card>
            <CardHeader>
              <CardTitle>分析概览</CardTitle>
              <CardDescription>
                {selectedKeyword 
                  ? `关键词 "${selectedKeyword}" 的数据概览`
                  : '选择一个关键词查看数据概览'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>加载中...</p>
              ) : taskStatus && ['pending', 'running'].includes(taskStatus.status) ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadgeColor(taskStatus.status)}>
                      {taskStatus.status === 'pending' ? '等待中' : '处理中'}
                    </Badge>
                    <span className="text-sm">{taskStatus.progress}%</span>
                  </div>
                  <Progress value={taskStatus.progress} className="w-full" />
                  {taskStatus.message && (
                    <p className="text-sm text-muted-foreground">{taskStatus.message}</p>
                  )}
                </div>
              ) : analysisResults ? (
                <div className="space-y-2">
                  <p><strong>仓库数量:</strong> {analysisResults.repository_count || 0}</p>
                  <p><strong>分析时间:</strong> {new Date(analysisResults.analysis_date).toLocaleString()}</p>
                  {analysisResults.charts?.stars_distribution?.data && (
                    <>
                      <p><strong>平均星标数:</strong> {Math.round(analysisResults.charts.stars_distribution.data.mean)}</p>
                      <p><strong>最高星标数:</strong> {analysisResults.charts.stars_distribution.data.max}</p>
                    </>
                  )}
                  
                  {/* 添加刷新图表按钮 */}
                  <Button 
                    onClick={regenerateCharts} 
                    disabled={isRegenerating || !selectedKeyword}
                    className="mt-4 w-full flex items-center justify-center gap-2"
                  >
                    {isRegenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        处理中...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" /> 更新分析数据
                      </>
                    )}
                  </Button>
                  
                  {searchMessage && (
                    <p className={`text-sm ${searchMessage.includes('失败') ? 'text-red-500' : 'text-green-500'}`}>
                      {searchMessage}
                    </p>
                  )}
                </div>
              ) : (
                <p>暂无数据</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* 任务状态展示 */}
        {taskStatus && taskStatus.status !== 'completed' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>任务进度</CardTitle>
                <CardDescription>关键词 "{selectedKeyword}" 的处理进度</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge className={getStatusBadgeColor(taskStatus.status)}>
                      {taskStatus.status === 'pending' ? '等待中' : 
                       taskStatus.status === 'running' ? '运行中' :
                       taskStatus.status === 'completed' ? '已完成' : '失败'}
                    </Badge>
                    <span>进度: {taskStatus.progress}%</span>
                  </div>
                  
                  <Progress value={taskStatus.progress} className="w-full" />
                  
                  {taskStatus.message && (
                    <p className="text-muted-foreground">{taskStatus.message}</p>
                  )}
                  
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">总仓库数</p>
                      <p className="text-xl font-semibold">{taskStatus.totalRepositories || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Python 项目</p>
                      <p className="text-xl font-semibold">{taskStatus.pythonRepositories || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Java 项目</p>
                      <p className="text-xl font-semibold">{taskStatus.javaRepositories || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* 分析结果展示 */}
        {analysisResults && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">"{selectedKeyword}" 的分析结果</h2>
            
            <Tabs defaultValue="language">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="language">语言分布</TabsTrigger>
                <TabsTrigger value="stars">星标分布</TabsTrigger>
                <TabsTrigger value="packages">常用包/库</TabsTrigger>
                <TabsTrigger value="functions">常用函数</TabsTrigger>
                <TabsTrigger value="wordcloud">注释关键词</TabsTrigger>
              </TabsList>
              
              {/* 语言分布 - 使用饼图 */}
              <TabsContent value="language">
                <Card>
                  <CardHeader>
                    <CardTitle>语言分布</CardTitle>
                    <CardDescription>关键词相关项目的编程语言分布</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    {analysisResults.charts?.language_distribution?.data && 
                     Object.keys(analysisResults.charts.language_distribution.data).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={prepareChartData(analysisResults.charts.language_distribution.data)}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={130}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {prepareChartData(analysisResults.charts.language_distribution.data).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} 个项目`, '数量']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p>暂无语言分布数据</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* 星标分布 - 使用柱状图 */}
              <TabsContent value="stars">
                <Card>
                  <CardHeader>
                    <CardTitle>星标分布</CardTitle>
                    <CardDescription>关键词相关项目的星标数分布</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    {analysisResults.charts?.stars_distribution?.data ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={prepareStarsData(analysisResults.charts.stars_distribution.data)}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value}`, '星标数']} />
                          <Legend />
                          <Bar dataKey="value" name="星标数" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p>暂无星标分布数据</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* 常用包/库 - 使用水平柱状图 */}
              <TabsContent value="packages">
                <Card>
                  <CardHeader>
                    <CardTitle>常用包/库</CardTitle>
                    <CardDescription>关键词相关项目中最常用的包和库</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    {analysisResults.charts?.common_packages?.data && 
                     Object.keys(analysisResults.charts.common_packages.data).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={prepareChartData(analysisResults.charts.common_packages.data).slice(0, 10)}
                          margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={100} />
                          <Tooltip formatter={(value) => [`${value} 个项目`, '使用数量']} />
                          <Legend />
                          <Bar dataKey="value" name="使用数量" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p>暂无包/库使用数据</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* 常用函数 - 使用水平柱状图 */}
              <TabsContent value="functions">
                <Card>
                  <CardHeader>
                    <CardTitle>常用函数</CardTitle>
                    <CardDescription>关键词相关项目中最常用的函数</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    {analysisResults.charts?.common_functions?.data && 
                     Object.keys(analysisResults.charts.common_functions.data).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={prepareChartData(analysisResults.charts.common_functions.data).slice(0, 10)}
                          margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={120} />
                          <Tooltip formatter={(value) => [`${value} 个项目`, '使用数量']} />
                          <Legend />
                          <Bar dataKey="value" name="使用数量" fill="#ff8042" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p>暂无函数使用数据</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* 注释关键词 - 使用表格展示，因为词云难以用recharts实现 */}
              <TabsContent value="wordcloud">
                <Card>
                  <CardHeader>
                    <CardTitle>注释关键词</CardTitle>
                    <CardDescription>代码注释中的高频词汇</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="border-b bg-muted/50">
                          <tr className="border-b transition-colors">
                            <th className="h-12 px-4 text-left align-middle font-medium">关键词</th>
                            <th className="h-12 px-4 text-left align-middle font-medium">出现次数</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisResults.charts?.comment_keywords?.data && 
                           Object.keys(analysisResults.charts.comment_keywords?.data).length > 0 ? (
                            Object.entries(analysisResults.charts.comment_keywords.data)
                              .slice(0, 15)  // 取前15个关键词
                              .map(([keyword, count], index) => (
                                <tr key={index} className="border-b transition-colors hover:bg-muted/50">
                                  <td className="p-4 align-middle">{keyword}</td>
                                  <td className="p-4 align-middle">{count}</td>
                                </tr>
                              ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="p-4 text-center">暂无注释关键词数据</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </main>
  )
} 