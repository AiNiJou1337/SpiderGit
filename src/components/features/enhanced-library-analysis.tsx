'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ExternalLink, Download, Filter, Search, TrendingUp, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LibraryFileUsageDialog } from './library-file-usage-dialog'

interface EnhancedLibraryAnalysisProps {
  keyword?: string
  title?: string
  libraryData?: Record<string, number>
}

interface LibraryInfo {
  name: string
  count: number // 文件使用次数
  repositoryCount: number // 实际涉及的仓库数量
  repositories: Array<{
    id: string
    name: string
    owner: string
    fullName: string
    language: string
    stars: number
    url: string
  }>
  trend: 'up' | 'down' | 'stable'
  category: string
}

export function EnhancedLibraryAnalysis({
  keyword = '',
  title = '增强库分析',
  libraryData = {}
}: EnhancedLibraryAnalysisProps) {
  const [libraries, setLibraries] = useState<LibraryInfo[]>([])
  const [filteredLibraries, setFilteredLibraries] = useState<LibraryInfo[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [fileUsageDialogOpen, setFileUsageDialogOpen] = useState(false)
  const [selectedLibrary, setSelectedLibrary] = useState<string>('')
  const [selectedLibraryName, setSelectedLibraryName] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'count' | 'name' | 'trend'>('count')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)
  const [trendMetrics, setTrendMetrics] = useState<TrendMetrics | null>(null)

  // 加载真实的库数据
  useEffect(() => {
    const loadLibraryData = async () => {
      setLoading(true)

      try {
        // 首先尝试获取预计算的趋势数据
        let precomputedTrends: Record<string, any> = {}
        let hasPrecomputedTrends = false

        if (keyword) {
          try {
            const response = await fetch(`/api/analysis?keyword=${encodeURIComponent(keyword)}`)
            if (response.ok) {
              const analysisData = await response.json()
              precomputedTrends = analysisData.trends?.libraries || {}
              hasPrecomputedTrends = Object.keys(precomputedTrends).length > 0

              if (hasPrecomputedTrends) {
                console.log('🚀 使用预计算的趋势数据，跳过重复计算')
              }
            }
          } catch (error) {
            console.warn('获取预计算趋势数据失败，将使用实时计算:', error)
          }
        }

        if (hasPrecomputedTrends) {
          // 使用预计算的趋势数据（性能优化路径）
          const enhancedLibraries: LibraryInfo[] = await Promise.all(
            Object.entries(libraryData).map(async ([name, count]) => {
              const trendData = precomputedTrends[name] || { trend: 'stable', category: 'other' }
              const repositoryCount = await getActualRepositoryCount(name)

              return {
                name,
                count,
                repositoryCount,
                repositories: await generateRealRepositories(name, repositoryCount),
                trend: trendData.trend as 'up' | 'down' | 'stable',
                category: trendData.category || getCategoryForLibrary(name)
              }
            })
          )

          setLibraries(enhancedLibraries)
        } else {
          // 降级到实时计算（兼容旧数据或无预计算数据的情况）
          console.log('⚡ 使用实时计算趋势数据')

          // 先获取所有库的基础数据
          const basicLibraries = await Promise.all(
            Object.entries(libraryData).map(async ([name, count]) => {
              const repositoryCount = await getActualRepositoryCount(name)
              return {
                name,
                count,
                repositoryCount,
                repositories: await generateRealRepositories(name, repositoryCount),
                category: getCategoryForLibrary(name)
              }
            })
          )

          // 计算统计指标用于趋势判断
          const calculatedMetrics = calculateTrendMetrics(basicLibraries.map(lib => lib.count))
          setTrendMetrics(calculatedMetrics)

          // 为每个库计算趋势
          const enhancedLibraries: LibraryInfo[] = basicLibraries.map(lib => ({
            ...lib,
            trend: calculateTrendWithMetrics(lib.count, calculatedMetrics)
          }))

          setLibraries(enhancedLibraries)
        }
      } catch (error) {
        console.error('加载库数据失败:', error)
        // 降级到模拟数据，但仍使用统计学趋势计算
        const counts = Object.values(libraryData)
        const trendMetrics = calculateTrendMetrics(counts)

        const fallbackLibraries: LibraryInfo[] = Object.entries(libraryData).map(([name, count]) => ({
          name,
          count,
          repositoryCount: Math.min(count, 10), // 估算仓库数量
          repositories: generateMockRepositories(name, count),
          trend: calculateTrendWithMetrics(count, trendMetrics),
          category: getCategoryForLibrary(name)
        }))
        setLibraries(fallbackLibraries)
      } finally {
        setLoading(false)
      }
    }

    loadLibraryData()
  }, [libraryData])

  // 过滤和排序
  useEffect(() => {
    let filtered = [...libraries]
    
    // 分类过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(lib => lib.category === selectedCategory)
    }
    
    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(lib => 
        lib.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'count':
          aValue = a.count
          bValue = b.count
          break
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'trend':
          const trendOrder = { up: 3, stable: 2, down: 1 }
          aValue = trendOrder[a.trend]
          bValue = trendOrder[b.trend]
          break
        default:
          aValue = a.count
          bValue = b.count
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    setFilteredLibraries(filtered)
  }, [libraries, selectedCategory, searchQuery, sortBy, sortOrder])

  // 获取使用该库的实际仓库数量
  const getActualRepositoryCount = async (libraryName: string): Promise<number> => {
    try {
      const response = await fetch(`/api/libraries/files?keyword=${encodeURIComponent(keyword)}&library=${encodeURIComponent(libraryName)}&limit=1`)
      if (response.ok) {
        const data = await response.json()
        // 通过去重仓库ID来计算实际仓库数量
        const uniqueRepos = new Set()
        const allFilesResponse = await fetch(`/api/libraries/files?keyword=${encodeURIComponent(keyword)}&library=${encodeURIComponent(libraryName)}&limit=1000`)
        if (allFilesResponse.ok) {
          const allData = await allFilesResponse.json()
          allData.files?.forEach((file: any) => {
            uniqueRepos.add(file.repository.id)
          })
        }
        return uniqueRepos.size
      }
    } catch (error) {
      console.error(`获取 ${libraryName} 仓库数量失败:`, error)
    }
    return 0
  }

  // 生成真实的仓库数据（前几个）
  const generateRealRepositories = async (libName: string, actualCount: number) => {
    try {
      const response = await fetch(`/api/libraries/files?keyword=${encodeURIComponent(keyword)}&library=${encodeURIComponent(libName)}&limit=5`)
      if (response.ok) {
        const data = await response.json()
        const uniqueRepos = new Map()

        data.files?.forEach((file: any) => {
          const repoId = file.repository.id
          if (!uniqueRepos.has(repoId)) {
            uniqueRepos.set(repoId, {
              id: file.repository.id,
              name: file.repository.name,
              owner: file.repository.owner,
              fullName: file.repository.fullName,
              language: file.repository.language,
              stars: file.repository.stars || 0,
              url: file.repository.url
            })
          }
        })

        return Array.from(uniqueRepos.values()).slice(0, 5)
      }
    } catch (error) {
      console.error(`获取 ${libName} 仓库数据失败:`, error)
    }

    // 降级到模拟数据
    return generateMockRepositories(libName, actualCount)
  }

  const generateMockRepositories = (libName: string, count: number) => {
    const mockRepos = []
    const repoCount = Math.min(count, 5) // 最多显示5个仓库

    for (let i = 0; i < repoCount; i++) {
      mockRepos.push({
        id: `${libName}-repo-${i}`,
        name: `${libName}-project-${i + 1}`,
        owner: `developer${i + 1}`,
        fullName: `developer${i + 1}/${libName}-project-${i + 1}`,
        language: getLanguageForLibrary(libName),
        stars: Math.floor(Math.random() * 10000) + 100,
        url: `https://github.com/developer${i + 1}/${libName}-project-${i + 1}`
      })
    }

    return mockRepos
  }

  // 统计指标接口
  interface TrendMetrics {
    mean: number        // 平均值
    median: number      // 中位数
    q1: number         // 第一四分位数 (25%)
    q3: number         // 第三四分位数 (75%)
    iqr: number        // 四分位距
    stdDev: number     // 标准差
    outlierThreshold: {
      lower: number    // 异常值下界
      upper: number    // 异常值上界
    }
  }

  // 计算统计指标
  const calculateTrendMetrics = (counts: number[]): TrendMetrics => {
    if (counts.length === 0) {
      return {
        mean: 0, median: 0, q1: 0, q3: 0, iqr: 0, stdDev: 0,
        outlierThreshold: { lower: 0, upper: 0 }
      }
    }

    // 排序数组
    const sorted = [...counts].sort((a, b) => a - b)
    const n = sorted.length

    // 计算中位数
    const median = n % 2 === 0
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2
      : sorted[Math.floor(n/2)]

    // 计算四分位数
    const q1Index = Math.floor(n * 0.25)
    const q3Index = Math.floor(n * 0.75)
    const q1 = sorted[q1Index]
    const q3 = sorted[q3Index]
    const iqr = q3 - q1

    // 计算平均值
    const mean = counts.reduce((sum, val) => sum + val, 0) / n

    // 计算标准差
    const variance = counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
    const stdDev = Math.sqrt(variance)

    // 计算异常值阈值 (使用IQR方法)
    const outlierThreshold = {
      lower: q1 - 1.5 * iqr,
      upper: q3 + 1.5 * iqr
    }

    return {
      mean,
      median,
      q1,
      q3,
      iqr,
      stdDev,
      outlierThreshold
    }
  }

  // 基于统计指标计算趋势
  const calculateTrendWithMetrics = (count: number, metrics: TrendMetrics): 'up' | 'down' | 'stable' => {
    const { mean, median, q1, q3, outlierThreshold } = metrics

    // 如果是异常高值，标记为up
    if (count >= outlierThreshold.upper) {
      return 'up'
    }

    // 如果是异常低值，标记为down
    if (count <= outlierThreshold.lower) {
      return 'down'
    }

    // 使用四分位数进行分类
    if (count >= q3) {
      return 'up'        // 高于第三四分位数 (前25%)
    } else if (count >= median) {
      return 'stable'    // 高于中位数但低于Q3 (25%-50%)
    } else if (count >= q1) {
      return 'stable'    // 高于第一四分位数但低于中位数 (50%-75%)
    } else {
      return 'down'      // 低于第一四分位数 (后25%)
    }
  }

  const getCategoryForLibrary = (libName: string): string => {
    const categories: Record<string, string> = {
      'react': 'frontend',
      'vue': 'frontend',
      'angular': 'frontend',
      'express': 'backend',
      'django': 'backend',
      'flask': 'backend',
      'tensorflow': 'ai',
      'pytorch': 'ai',
      'pandas': 'data',
      'numpy': 'data'
    }
    
    return categories[libName.toLowerCase()] || 'other'
  }

  const getLanguageForLibrary = (libName: string): string => {
    const languages: Record<string, string> = {
      'react': 'JavaScript',
      'vue': 'JavaScript',
      'express': 'JavaScript',
      'django': 'Python',
      'flask': 'Python',
      'tensorflow': 'Python',
      'pytorch': 'Python'
    }
    
    return languages[libName.toLowerCase()] || 'JavaScript'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
      case 'stable':
        return <div className="w-4 h-4 bg-yellow-500 rounded-full" />
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />
    }
  }

  const getTrendLabel = (trend: string) => {
    const labels = {
      'up': '热门',
      'stable': '常用',
      'down': '冷门'
    }
    return labels[trend as keyof typeof labels] || '未知'
  }

  const getTrendDescription = (trend: string) => {
    const descriptions = {
      'up': '使用频率高于75%的库 (Q3以上)',
      'stable': '使用频率中等的库 (Q1-Q3之间)',
      'down': '使用频率较低的库 (Q1以下)'
    }
    return descriptions[trend as keyof typeof descriptions] || ''
  }

  // 打开文件使用详情弹窗
  const handleViewFileUsage = (libraryName: string) => {
    setSelectedLibrary(libraryName)
    setSelectedLibraryName(libraryName)
    setFileUsageDialogOpen(true)
  }

  const categories = [
    { value: 'all', label: '所有分类' },
    { value: 'frontend', label: '前端' },
    { value: 'backend', label: '后端' },
    { value: 'ai', label: 'AI/ML' },
    { value: 'data', label: '数据处理' },
    { value: 'other', label: '其他' }
  ]

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">加载中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {keyword && `关键词: ${keyword} | `}
              共 {filteredLibraries.length} 个库
            </p>
            <p className="text-xs text-gray-500 mt-1">
              💡 文件使用次数：该库在多少个代码文件中被引用 | 涉及仓库数：使用该库的不同仓库数量
            </p>
            {trendMetrics && (
              <div className="text-xs text-blue-600 mt-1 space-y-1">
                <p>📊 趋势基准：平均 {trendMetrics.mean.toFixed(1)} | 中位数 {trendMetrics.median.toFixed(1)} |
                Q1: {trendMetrics.q1.toFixed(1)} | Q3: {trendMetrics.q3.toFixed(1)}</p>
                <p>🎯 分类标准：热门(≥{trendMetrics.q3.toFixed(1)}) | 常用({trendMetrics.q1.toFixed(1)}-{trendMetrics.q3.toFixed(1)}) | 冷门(≤{trendMetrics.q1.toFixed(1)})</p>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            导出数据
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 过滤器 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索库名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="分类" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="排序" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">使用次数</SelectItem>
              <SelectItem value="name">名称</SelectItem>
              <SelectItem value="trend">趋势</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 图表 */}
        {filteredLibraries.length > 0 && (
          <div className="mb-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredLibraries.slice(0, 10)}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {filteredLibraries.slice(0, 10).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`hsl(${index * 36}, 70%, 50%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 表格 */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>库名</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>文件使用次数</TableHead>
                <TableHead>趋势</TableHead>
                <TableHead>涉及仓库数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLibraries.map((library) => (
                <TableRow key={library.name}>
                  <TableCell className="font-medium">{library.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{library.category}</Badge>
                  </TableCell>
                  <TableCell>{library.count}</TableCell>
                  <TableCell>
                    <div className="flex items-center" title={getTrendDescription(library.trend)}>
                      {getTrendIcon(library.trend)}
                      <span className="ml-1 text-sm">{getTrendLabel(library.trend)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {library.repositoryCount} 个仓库
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewFileUsage(library.name)}
                        title="查看使用该库的文件详情"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredLibraries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            没有找到匹配的库数据
          </div>
        )}
      </CardContent>
    </Card>

    {/* 文件使用详情弹窗 */}
    <LibraryFileUsageDialog
      open={fileUsageDialogOpen}
      onOpenChange={setFileUsageDialogOpen}
      keyword={keyword}
      library={selectedLibrary}
      libraryDisplayName={selectedLibraryName}
    />
  </>
  )
}
