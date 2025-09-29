'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Download } from 'lucide-react'
import { getLanguageColor } from '@/lib/utils/language-colors'
import { formatNumber } from '@/lib/utils'

interface Repository {
  id?: number
  name: string
  owner: string
  fullName: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  todayStars: number
  url: string
  trendPeriod?: string
}

interface TrendingChartsProps {
  repositories: Repository[]
  period: 'daily' | 'weekly' | 'monthly'
  className?: string
}

interface ChartDataPoint {
  name: string
  value: number
  color?: string
  percentage?: number
}

interface GrowthDataPoint {
  name: string
  stars: number
  forks: number
  growth: number
}

export function TrendingCharts({ repositories, period, className }: TrendingChartsProps) {
  const [activeTab, setActiveTab] = useState('language-distribution')
  const [selectedMetric, setSelectedMetric] = useState<'stars' | 'forks' | 'growth'>('stars')

  // 计算语言分布数据
  const languageData = useMemo(() => {
    const languageCount: Record<string, number> = {}
    const languageStars: Record<string, number> = {}
    
    repositories.forEach(repo => {
      if (repo.language) {
        languageCount[repo.language] = (languageCount[repo.language] || 0) + 1
        languageStars[repo.language] = (languageStars[repo.language] || 0) + repo.stars
      }
    })

    const total = repositories.length
    return Object.entries(languageCount)
      .map(([language, count]) => ({
        name: language,
        value: count,
        stars: languageStars[language],
        percentage: (count / total) * 100,
        color: getLanguageColor(language)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // 只显示前10种语言
  }, [repositories])

  // 计算增长趋势数据
  const growthData = useMemo(() => {
    return repositories
      .filter(repo => repo.todayStars > 0)
      .sort((a, b) => b.todayStars - a.todayStars)
      .slice(0, 15)
      .map(repo => ({
        name: repo.name.length > 15 ? repo.name.substring(0, 15) + '...' : repo.name,
        fullName: repo.fullName,
        stars: repo.stars,
        forks: repo.forks,
        growth: repo.todayStars,
        language: repo.language
      }))
  }, [repositories])

  // 计算项目活跃度数据（散点图）
  const activityData = useMemo(() => {
    return repositories
      .filter(repo => repo.todayStars > 0 || repo.stars > 100)
      .map(repo => ({
        name: repo.name,
        fullName: repo.fullName,
        x: repo.stars, // X轴：总Star数
        y: repo.todayStars || 0, // Y轴：今日增长
        z: repo.forks, // 气泡大小：Fork数
        language: repo.language,
        color: getLanguageColor(repo.language || 'Other'),
        // 活跃度评分
        activityScore: Math.round(
          (Math.log10(repo.stars + 1) * 20) +
          ((repo.todayStars || 0) * 2) +
          (Math.log10(repo.forks + 1) * 10)
        )
      }))
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 50) // 显示前50个最活跃的项目
  }, [repositories])

  // 计算技术栈雷达图数据
  const techRadarData = useMemo(() => {
    const languageMetrics: Record<string, {
      count: number
      totalStars: number
      totalGrowth: number
      avgStars: number
      avgGrowth: number
    }> = {}

    repositories.forEach(repo => {
      const lang = repo.language || 'Other'
      if (!languageMetrics[lang]) {
        languageMetrics[lang] = {
          count: 0,
          totalStars: 0,
          totalGrowth: 0,
          avgStars: 0,
          avgGrowth: 0
        }
      }

      languageMetrics[lang].count++
      languageMetrics[lang].totalStars += repo.stars
      languageMetrics[lang].totalGrowth += repo.todayStars || 0
    })

    // 计算平均值并标准化
    const maxStars = Math.max(...Object.values(languageMetrics).map(m => m.totalStars))
    const maxGrowth = Math.max(...Object.values(languageMetrics).map(m => m.totalGrowth))
    const maxCount = Math.max(...Object.values(languageMetrics).map(m => m.count))
    const maxAvgStars = Math.max(...Object.values(languageMetrics).map(m => m.totalStars / m.count))
    const maxAvgGrowth = Math.max(...Object.values(languageMetrics).map(m => m.totalGrowth / m.count))

    const result = Object.entries(languageMetrics)
      .map(([language, metrics]) => {
        // 安全的数值计算，避免 NaN 和 Infinity
        const safeValue = (value: number) => isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0

        const data = {
          language,
          总热度: safeValue((metrics.totalStars / maxStars) * 100),
          增长势头: maxGrowth > 0 ? safeValue((metrics.totalGrowth / maxGrowth) * 100) : 0,
          平均质量: maxAvgStars > 0 ? safeValue(((metrics.totalStars / metrics.count) / maxAvgStars) * 100) : 0,
          活跃程度: maxAvgGrowth > 0 ? safeValue(((metrics.totalGrowth / metrics.count) / maxAvgGrowth) * 100) : 0,
          color: getLanguageColor(language)
        }
        return data
      })
      .sort((a, b) => (b.总热度 + b.增长势头) - (a.总热度 + a.增长势头))
      .slice(0, 8) // 显示前8种语言

    // 调试信息
    console.log('🎯 技术雷达数据:', result)
    return result
  }, [repositories])

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'daily': return '今日'
      case 'weekly': return '本周'
      case 'monthly': return '本月'
      default: return '当前'
    }
  }

  const renderCustomTooltip = (props: any) => {
    const { active, payload, label } = props
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.payload.percentage && (
                <span className="text-gray-500 ml-1">
                  ({entry.payload.percentage.toFixed(1)}%)
                </span>
              )}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderLanguagePieLabel = ({ name, percentage }: any) => {
    return percentage > 5 ? `${name} ${percentage.toFixed(1)}%` : ''
  }

  const handleExportChart = (chartType: string) => {
    // 这里可以实现图表导出功能
    console.log(`导出 ${chartType} 图表`)
  }

  if (!repositories || repositories.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">暂无数据可视化</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>趋势分析</span>
            </CardTitle>
            <CardDescription>
              {getPeriodLabel(period)}趋势数据可视化分析
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExportChart(activeTab)}
          >
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="language-distribution">语言分布</TabsTrigger>
            <TabsTrigger value="growth-trend">增长趋势</TabsTrigger>
            <TabsTrigger value="activity-analysis">活跃度分析</TabsTrigger>
            <TabsTrigger value="tech-radar">技术雷达</TabsTrigger>
          </TabsList>

          <TabsContent value="language-distribution" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 饼图 */}
              <div>
                <h3 className="text-lg font-medium mb-4">语言占比分布</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderLanguagePieLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={renderCustomTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 趋势变化图 */}
              <div>
                <h3 className="text-lg font-medium mb-4">语言热度趋势</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={techRadarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="language" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        `${value}%`,
                        name === '总热度' ? '总热度指数' :
                        name === '增长势头' ? '增长势头指数' :
                        name === '活跃程度' ? '活跃程度指数' : name
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="总热度"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="增长势头"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="活跃程度"
                      stroke="#ffc658"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="growth-trend" className="mt-6">
            <div className="mb-4">
              <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="选择指标" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth">增长数量</SelectItem>
                  <SelectItem value="stars">总Star数</SelectItem>
                  <SelectItem value="forks">总Fork数</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip 
                  content={(props) => {
                    if (props.active && props.payload && props.payload.length > 0 && props.payload[0] && props.payload[0].payload) {
                      const data = props.payload[0].payload as any
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-medium">{data.fullName}</p>
                          <p>Stars: {formatNumber(data.stars)}</p>
                          <p>Forks: {formatNumber(data.forks)}</p>
                          <p>今日增长: +{formatNumber(data.growth)}</p>
                          {data.language && <p>语言: {data.language}</p>}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="activity-analysis" className="mt-6">
            <div>
              <h3 className="text-lg font-medium mb-4">项目活跃度分析</h3>
              <p className="text-sm text-gray-600 mb-4">
                横轴：总Star数 | 纵轴：今日增长 | 气泡大小：Fork数
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="总Stars"
                    scale="log"
                    domain={['dataMin', 'dataMax']}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="今日增长"
                  />
                  <Tooltip
                    content={(props) => {
                      if (props.active && props.payload && props.payload.length > 0 && props.payload[0] && props.payload[0].payload) {
                        const data = props.payload[0].payload
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                            <p className="font-medium">{data.fullName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              总Stars: {formatNumber(data.x)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              今日增长: +{formatNumber(data.y)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Forks: {formatNumber(data.z)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              活跃度评分: {data.activityScore}
                            </p>
                            {data.language && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                语言: {data.language}
                              </p>
                            )}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Scatter dataKey="y" fill="#8884d8">
                    {activityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="tech-radar" className="mt-6">
            <div>
              <h3 className="text-lg font-medium mb-4">技术栈雷达分析</h3>
              <p className="text-sm text-gray-600 mb-4">
                多维度分析各编程语言的综合表现
              </p>

              {/* 指标说明 */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">📊 雷达图指标说明</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium">总热度</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs ml-5">
                      该语言所有项目的总Star数，体现整体受欢迎程度
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="font-medium">增长势头</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs ml-5">
                      该语言项目的总增长Star数，反映当前发展趋势
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="font-medium">平均质量</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs ml-5">
                      该语言项目的平均Star数，衡量项目质量水平
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                      <span className="font-medium">活跃程度</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs ml-5">
                      该语言项目的平均增长率，反映社区活跃度
                    </p>
                  </div>

                  <div className="col-span-full">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span className="font-medium">计算方式</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs ml-5">
                      所有指标均标准化为0-100分，便于对比分析
                    </p>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={techRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="language" />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={false}
                  />
                  <Radar
                    name="总热度"
                    dataKey="总热度"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Radar
                    name="增长势头"
                    dataKey="增长势头"
                    stroke="#eab308"
                    fill="#eab308"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Radar
                    name="平均质量"
                    dataKey="平均质量"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Radar
                    name="活跃程度"
                    dataKey="活跃程度"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Legend />
                  <Tooltip
                    content={(props) => {
                      if (props.active && props.payload && props.payload.length > 0 && props.payload[0] && props.payload[0].payload) {
                        const data = props.payload[0].payload
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-medium">{data.language}</p>
                            <p>总热度: {data.总热度}/100</p>
                            <p>增长势头: {data.增长势头}/100</p>
                            <p>平均质量: {data.平均质量}/100</p>
                            <p>活跃程度: {data.活跃程度}/100</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="mt-6">
            <div className="space-y-6">
              {/* 热度评分排行 */}
              <div>
                <h3 className="text-lg font-medium mb-4">热度评分排行</h3>
                <div className="space-y-3">
                  {repositories
                    .map(repo => ({
                      ...repo,
                      heatScore: Math.round(
                        (Math.min(repo.stars / 10000, 1) * 40) +
                        (Math.min(repo.forks / 2000, 1) * 30) +
                        (Math.min((repo.todayStars || 0) / 100, 1) * 30)
                      )
                    }))
                    .sort((a, b) => b.heatScore - a.heatScore)
                    .slice(0, 10)
                    .map((repo, index) => (
                      <div key={repo.fullName} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {repo.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {typeof repo.owner === 'string' ? repo.owner :
                             typeof repo.owner === 'object' && repo.owner && (repo.owner as any).login ? (repo.owner as any).login :
                             'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {repo.heatScore}/100
                            </p>
                            <p className="text-xs text-gray-500">
                              热度评分
                            </p>
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${repo.heatScore}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* 增长率对比 */}
              <div>
                <h3 className="text-lg font-medium mb-4">增长率对比</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={repositories
                      .filter(repo => repo.todayStars > 0)
                      .map(repo => ({
                        name: repo.name.length > 10 ? repo.name.substring(0, 10) + '...' : repo.name,
                        fullName: repo.fullName,
                        growthRate: repo.stars > 0 ? ((repo.todayStars / repo.stars) * 100).toFixed(2) : 0,
                        todayStars: repo.todayStars,
                        totalStars: repo.stars
                      }))
                      .sort((a, b) => {
                        const aRate = typeof a.growthRate === 'number' ? a.growthRate : parseFloat(a.growthRate as string);
                        const bRate = typeof b.growthRate === 'number' ? b.growthRate : parseFloat(b.growthRate as string);
                        return bRate - aRate;
                      })
                      .slice(0, 15)
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis label={{ value: '增长率 (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      content={(props) => {
                        if (props.active && props.payload && props.payload.length > 0 && props.payload[0] && props.payload[0].payload) {
                          const data = props.payload[0].payload
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-medium">{data.fullName}</p>
                              <p>增长率: {data.growthRate}%</p>
                              <p>今日增长: +{formatNumber(data.todayStars)}</p>
                              <p>总Stars: {formatNumber(data.totalStars)}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="growthRate" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
