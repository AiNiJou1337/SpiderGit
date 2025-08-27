'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  TestTube,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Terminal,
  Code,
  Database,
  Globe,
  Settings,
  FileText,
  Activity,
  Zap,
  Link,
  Search,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react'

interface TestResult {
  id: string
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  duration?: number
  error?: string
  output?: string
  coverage?: number
}

interface TestSuite {
  id: string
  name: string
  description: string
  type: 'frontend' | 'backend' | 'integration' | 'e2e' | 'connection' | 'crawler' | 'api'
  tests: TestResult[]
  totalTests: number
  passedTests: number
  failedTests: number
  coverage: number
}

interface ConnectionTestResult {
  tokenLoading: boolean
  apiConnection: boolean
  simpleSearch: boolean
  rateLimit?: {
    remaining: number
    limit: number
  }
  error?: string
}

interface CrawlerTestConfig {
  keyword: string
  language: string
  maxResults: number
  includeAnalysis: boolean
}

export default function TestingPage() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [selectedSuite, setSelectedSuite] = useState<string>('all')
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null)
  const [crawlerConfig, setCrawlerConfig] = useState<CrawlerTestConfig>({
    keyword: 'react',
    language: 'javascript',
    maxResults: 10,
    includeAnalysis: false
  })

  // 初始化测试套件
  useEffect(() => {
    initializeTestSuites()
    fetchTestResults()
  }, [])

  const initializeTestSuites = () => {
    const suites: TestSuite[] = [
      {
        id: 'connection',
        name: '连接测试',
        description: 'GitHub API连接、Token验证、网络状态测试',
        type: 'connection',
        tests: [],
        totalTests: 3,
        passedTests: 0,
        failedTests: 0,
        coverage: 0
      },
      {
        id: 'crawler',
        name: '爬虫测试',
        description: '数据爬取、解析、存储功能测试',
        type: 'crawler',
        tests: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverage: 0
      },
      {
        id: 'api',
        name: 'API测试',
        description: 'Next.js API路由、接口响应测试',
        type: 'api',
        tests: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverage: 0
      },
      {
        id: 'frontend',
        name: '前端测试',
        description: 'React组件、用户交互、界面测试',
        type: 'frontend',
        tests: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverage: 0
      },
      {
        id: 'backend',
        name: '后端测试',
        description: 'Python模块、数据处理、业务逻辑测试',
        type: 'backend',
        tests: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverage: 0
      },
      {
        id: 'integration',
        name: '集成测试',
        description: '系统集成、端到端流程测试',
        type: 'integration',
        tests: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverage: 0
      }
    ]
    setTestSuites(suites)
  }

  // 运行连接测试
  const runConnectionTest = async () => {
    setIsRunning(true)
    addLog(`🔗 开始运行连接测试...`)

    try {
      const response = await fetch('/api/testing/connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        setConnectionResult(result.data)
        addLog(`✅ 连接测试完成`)
        await fetchTestResults()
      } else {
        addLog(`❌ 连接测试失败: ${response.statusText}`)
      }
    } catch (error) {
      addLog(`❌ 连接测试错误: ${error}`)
    } finally {
      setIsRunning(false)
    }
  }

  // 运行爬虫测试
  const runCrawlerTest = async () => {
    setIsRunning(true)
    addLog(`🕷️ 开始运行爬虫测试: ${crawlerConfig.keyword}`)

    try {
      const response = await fetch('/api/testing/crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(crawlerConfig)
      })

      if (response.ok) {
        const result = await response.json()
        addLog(`✅ 爬虫测试完成: ${result.message}`)
        await fetchTestResults()
      } else {
        addLog(`❌ 爬虫测试失败: ${response.statusText}`)
      }
    } catch (error) {
      addLog(`❌ 爬虫测试错误: ${error}`)
    } finally {
      setIsRunning(false)
    }
  }

  // 运行标准测试套件
  const runTests = async (suiteId: string = 'all') => {
    setIsRunning(true)
    addLog(`🚀 开始运行测试套件: ${suiteId}`)

    try {
      const response = await fetch('/api/testing/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ suite: suiteId })
      })

      if (response.ok) {
        const result = await response.json()
        addLog(`✅ 测试完成: ${result.message}`)
        await fetchTestResults()
      } else {
        addLog(`❌ 测试失败: ${response.statusText}`)
      }
    } catch (error) {
      addLog(`❌ 测试执行错误: ${error}`)
    } finally {
      setIsRunning(false)
    }
  }

  const fetchTestResults = async () => {
    try {
      const response = await fetch('/api/testing/results')
      if (response.ok) {
        const results = await response.json()
        setTestSuites(results.suites || [])
        addLog(`📊 测试结果已更新`)
      }
    } catch (error) {
      addLog(`❌ 获取测试结果失败: ${error}`)
    }
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const clearLogs = () => {
    setLogs([])
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'connection':
        return <Link className="w-5 h-5 text-blue-500" />
      case 'crawler':
        return <Search className="w-5 h-5 text-green-500" />
      case 'api':
        return <Zap className="w-5 h-5 text-yellow-500" />
      case 'frontend':
        return <Globe className="w-5 h-5 text-blue-500" />
      case 'backend':
        return <Database className="w-5 h-5 text-green-500" />
      case 'integration':
        return <Settings className="w-5 h-5 text-purple-500" />
      default:
        return <TestTube className="w-5 h-5 text-gray-500" />
    }
  }

  const totalTests = testSuites.reduce((sum, suite) => sum + suite.totalTests, 0)
  const totalPassed = testSuites.reduce((sum, suite) => sum + suite.passedTests, 0)
  const totalFailed = testSuites.reduce((sum, suite) => sum + suite.failedTests, 0)
  const overallCoverage = testSuites.length > 0 
    ? testSuites.reduce((sum, suite) => sum + suite.coverage, 0) / testSuites.length 
    : 0

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <TestTube className="w-8 h-8 text-blue-600" />
            <span>项目测试</span>
          </h1>
          <p className="text-gray-600 mt-2">
            集中管理和执行项目的所有测试功能，包括连接测试、爬虫测试、API测试、前端测试、后端测试和集成测试
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={() => runTests('all')} 
            disabled={isRunning}
            className="flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>{isRunning ? '运行中...' : '运行所有测试'}</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchTestResults}
            className="flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>刷新结果</span>
          </Button>
        </div>
      </div>

      {/* 总览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">总测试数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">通过测试</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalPassed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">失败测试</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">代码覆盖率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallCoverage.toFixed(1)}%</div>
            <Progress value={overallCoverage} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* 主要内容 */}
      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="connection" className="flex items-center space-x-2">
            <Link className="w-4 h-4" />
            <span>连接测试</span>
          </TabsTrigger>
          <TabsTrigger value="crawler" className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>爬虫测试</span>
          </TabsTrigger>
          <TabsTrigger value="suites" className="flex items-center space-x-2">
            <TestTube className="w-4 h-4" />
            <span>测试套件</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center space-x-2">
            <Terminal className="w-4 h-4" />
            <span>执行日志</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>配置管理</span>
          </TabsTrigger>
        </TabsList>

        {/* 连接测试 */}
        <TabsContent value="connection" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 连接测试控制面板 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Link className="w-5 h-5" />
                  <span>GitHub API 连接测试</span>
                </CardTitle>
                <CardDescription>
                  测试GitHub API连接状态、Token有效性和网络连通性
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={runConnectionTest}
                  disabled={isRunning}
                  className="w-full flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>{isRunning ? '测试中...' : '开始连接测试'}</span>
                </Button>

                {connectionResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Token加载</span>
                      {connectionResult.tokenLoading ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">API连接</span>
                      {connectionResult.apiConnection ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">搜索测试</span>
                      {connectionResult.simpleSearch ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    {connectionResult.rateLimit && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-800">API速率限制</div>
                        <div className="text-xs text-blue-600">
                          {connectionResult.rateLimit.remaining}/{connectionResult.rateLimit.limit} 剩余
                        </div>
                        <Progress
                          value={(connectionResult.rateLimit.remaining / connectionResult.rateLimit.limit) * 100}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 连接状态信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>连接状态信息</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">测试项目</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• GitHub Token 环境变量加载</li>
                      <li>• GitHub API 基础连接测试</li>
                      <li>• 简单仓库搜索功能测试</li>
                      <li>• API 速率限制状态检查</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">常见问题</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 检查 .env 文件中的 Token 配置</li>
                      <li>• 确认网络连接正常</li>
                      <li>• 验证 Token 权限和有效期</li>
                      <li>• 检查代理设置（如有）</li>
                    </ul>
                  </div>

                  {connectionResult?.error && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {connectionResult.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 爬虫测试 */}
        <TabsContent value="crawler" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 爬虫测试配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="w-5 h-5" />
                  <span>爬虫测试配置</span>
                </CardTitle>
                <CardDescription>
                  配置爬虫测试参数，测试数据爬取和解析功能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="keyword">搜索关键词</Label>
                    <Input
                      id="keyword"
                      value={crawlerConfig.keyword}
                      onChange={(e) => setCrawlerConfig(prev => ({ ...prev, keyword: e.target.value }))}
                      placeholder="例如: react, vue, python"
                    />
                  </div>
                  <div>
                    <Label htmlFor="language">编程语言</Label>
                    <Select
                      value={crawlerConfig.language}
                      onValueChange={(value) => setCrawlerConfig(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="go">Go</SelectItem>
                        <SelectItem value="rust">Rust</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="maxResults">最大结果数</Label>
                  <Input
                    id="maxResults"
                    type="number"
                    value={crawlerConfig.maxResults}
                    onChange={(e) => setCrawlerConfig(prev => ({ ...prev, maxResults: parseInt(e.target.value) || 10 }))}
                    min="1"
                    max="100"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeAnalysis"
                    checked={crawlerConfig.includeAnalysis}
                    onChange={(e) => setCrawlerConfig(prev => ({ ...prev, includeAnalysis: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="includeAnalysis">包含代码分析</Label>
                </div>

                <Button
                  onClick={runCrawlerTest}
                  disabled={isRunning}
                  className="w-full flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>{isRunning ? '爬取中...' : '开始爬虫测试'}</span>
                </Button>
              </CardContent>
            </Card>

            {/* 爬虫测试结果 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>测试结果</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">测试功能</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 关键词搜索爬取</li>
                      <li>• 仓库数据解析</li>
                      <li>• 数据存储验证</li>
                      <li>• 错误处理测试</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">支持的数据源</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">GitHub Trending</Badge>
                      <Badge variant="secondary">Repository Search</Badge>
                      <Badge variant="secondary">User Profiles</Badge>
                      <Badge variant="secondary">Code Analysis</Badge>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">输出格式</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• JSON 数据文件</li>
                      <li>• CSV 导出格式</li>
                      <li>• 分析报告</li>
                      <li>• 错误日志</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 测试套件 */}
        <TabsContent value="suites" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {testSuites.map(suite => (
              <Card key={suite.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(suite.type)}
                      <div>
                        <CardTitle className="text-lg">{suite.name}</CardTitle>
                        <CardDescription>{suite.description}</CardDescription>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => runTests(suite.id)}
                      disabled={isRunning}
                      className="flex items-center space-x-1"
                    >
                      <Play className="w-3 h-3" />
                      <span>运行</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 统计信息 */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold">{suite.totalTests}</div>
                        <div className="text-gray-500">总计</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{suite.passedTests}</div>
                        <div className="text-gray-500">通过</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-600">{suite.failedTests}</div>
                        <div className="text-gray-500">失败</div>
                      </div>
                    </div>

                    {/* 覆盖率 */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>代码覆盖率</span>
                        <span>{suite.coverage.toFixed(1)}%</span>
                      </div>
                      <Progress value={suite.coverage} />
                    </div>

                    {/* 最近测试结果 */}
                    {suite.tests.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">最近测试</h4>
                        <div className="space-y-1">
                          {suite.tests.slice(0, 3).map(test => (
                            <div key={test.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(test.status)}
                                <span className="truncate">{test.name}</span>
                              </div>
                              {test.duration && (
                                <Badge variant="secondary" className="text-xs">
                                  {test.duration}ms
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 执行日志 */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Terminal className="w-5 h-5" />
                  <span>执行日志</span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={clearLogs}>
                  清空日志
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">暂无日志信息...</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配置管理 */}
        <TabsContent value="config">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Code className="w-5 h-5" />
                  <span>前端测试配置</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>测试框架:</span>
                    <Badge>Jest + React Testing Library</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>配置文件:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">tests/frontend/jest.config.js</code>
                  </div>
                  <div className="flex justify-between">
                    <span>覆盖率目标:</span>
                    <span>80%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>后端测试配置</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>测试框架:</span>
                    <Badge>pytest</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>配置文件:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">backend/pyproject.toml</code>
                  </div>
                  <div className="flex justify-between">
                    <span>覆盖率目标:</span>
                    <span>60%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
