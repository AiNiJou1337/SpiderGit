'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Image,
  Database,
  Code,
  CheckCircle,
  AlertCircle,
  Settings,
  Filter,
  ChevronDown
} from 'lucide-react'
import { formatDate } from '@/lib/utils/helpers'

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
  createdAt?: string
  updatedAt?: string
}

interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx' | 'md' | 'sql'
  fields: string[]
  includeMetadata: boolean
  includeStats: boolean
  includeCharts: boolean
  filterBy: 'all' | 'top' | 'trending' | 'custom'
  customLimit: number
  groupBy: 'none' | 'language' | 'quality' | 'trending'
  sortBy: 'stars' | 'forks' | 'growth' | 'name'
  sortOrder: 'asc' | 'desc'
}

interface AdvancedExportProps {
  repositories: Repository[]
  period: 'daily' | 'weekly' | 'monthly'
  className?: string
  onExport?: (data: any, options: ExportOptions) => void
}

const availableFields = [
  { key: 'name', label: '项目名称', required: true },
  { key: 'owner', label: '作者', required: true },
  { key: 'fullName', label: '完整名称', required: false },
  { key: 'description', label: '项目描述', required: false },
  { key: 'language', label: '编程语言', required: false },
  { key: 'stars', label: 'Star数量', required: false },
  { key: 'forks', label: 'Fork数量', required: false },
  { key: 'todayStars', label: '今日增长', required: false },
  { key: 'url', label: '项目链接', required: false },
  { key: 'createdAt', label: '创建时间', required: false },
  { key: 'updatedAt', label: '更新时间', required: false }
]

export function AdvancedExport({ repositories, period, className, onExport }: AdvancedExportProps) {
  const [isOpen, setIsOpen] = useState(false) // 默认关闭状态
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    fields: ['name', 'owner', 'language', 'stars', 'forks', 'todayStars', 'url'],
    includeMetadata: true,
    includeStats: true,
    includeCharts: false,
    filterBy: 'all',
    customLimit: 100,
    groupBy: 'none',
    sortBy: 'stars',
    sortOrder: 'desc'
  })

  const handleFieldToggle = (fieldKey: string) => {
    const field = availableFields.find(f => f.key === fieldKey)
    if (field?.required) return // 不能取消必需字段

    setOptions(prev => ({
      ...prev,
      fields: prev.fields.includes(fieldKey)
        ? prev.fields.filter(f => f !== fieldKey)
        : [...prev.fields, fieldKey]
    }))
  }

  const processData = () => {
    let processedData = [...repositories]

    // 排序
    processedData.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (options.sortBy) {
        case 'stars':
          aValue = a.stars
          bValue = b.stars
          break
        case 'forks':
          aValue = a.forks
          bValue = b.forks
          break
        case 'growth':
          aValue = a.todayStars || 0
          bValue = b.todayStars || 0
          break
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        default:
          aValue = a.stars
          bValue = b.stars
      }

      if (options.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    // 筛选
    switch (options.filterBy) {
      case 'top':
        processedData = processedData.slice(0, 50)
        break
      case 'trending':
        processedData = processedData.filter(repo => (repo.todayStars || 0) > 0).slice(0, 50)
        break
      case 'custom':
        processedData = processedData.slice(0, options.customLimit)
        break
    }

    // 只保留选中的字段
    return processedData.map(repo => {
      const filteredRepo: any = {}
      options.fields.forEach(field => {
        filteredRepo[field] = (repo as any)[field]
      })
      return filteredRepo
    })
  }

  const generateMetadata = () => {
    return {
      exportDate: new Date().toISOString(),
      period,
      totalRepositories: repositories.length,
      exportedCount: processData().length,
      options: {
        format: options.format,
        fields: options.fields,
        filterBy: options.filterBy,
        sortBy: options.sortBy,
        sortOrder: options.sortOrder
      }
    }
  }

  const generateStats = () => {
    const data = processData()
    const languages = data.reduce((acc: Record<string, number>, repo) => {
      if (repo.language) {
        acc[repo.language] = (acc[repo.language] || 0) + 1
      }
      return acc
    }, {})

    return {
      totalStars: data.reduce((sum, repo) => sum + (repo.stars || 0), 0),
      totalForks: data.reduce((sum, repo) => sum + (repo.forks || 0), 0),
      totalGrowth: data.reduce((sum, repo) => sum + (repo.todayStars || 0), 0),
      languageDistribution: languages,
      averageStars: Math.round(data.reduce((sum, repo) => sum + (repo.stars || 0), 0) / data.length),
      topLanguage: Object.entries(languages).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown'
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportStatus('idle')

    try {
      const data = processData()
      const exportData: any = { repositories: data }

      if (options.includeMetadata) {
        exportData.metadata = generateMetadata()
      }

      if (options.includeStats) {
        exportData.statistics = generateStats()
      }

      // 调用外部导出处理函数
      if (onExport) {
        await onExport(exportData, options)
      } else {
        // 默认导出处理
        await defaultExport(exportData)
      }

      setExportStatus('success')
    } catch (error) {
      console.error('导出失败:', error)
      setExportStatus('error')
    } finally {
      setIsExporting(false)
    }
  }

  const defaultExport = async (data: any) => {
    const filename = `github-trending-${period}-${formatDate(new Date())}`
    
    let content: string
    let mimeType: string
    let fileExtension: string

    switch (options.format) {
      case 'json':
        content = JSON.stringify(data, null, 2)
        mimeType = 'application/json'
        fileExtension = 'json'
        break
      case 'csv':
        content = convertToCSV(data.repositories)
        mimeType = 'text/csv'
        fileExtension = 'csv'
        break
      case 'md':
        content = convertToMarkdown(data)
        mimeType = 'text/markdown'
        fileExtension = 'md'
        break
      case 'sql':
        content = convertToSQL(data.repositories)
        mimeType = 'text/sql'
        fileExtension = 'sql'
        break
      default:
        throw new Error('不支持的导出格式')
    }

    // 创建下载链接
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.${fileExtension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return ''
    
    const headers = options.fields.join(',')
    const rows = data.map(row => 
      options.fields.map(field => {
        const value = row[field] || ''
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(',')
    )
    
    return [headers, ...rows].join('\n')
  }

  const convertToMarkdown = (data: any) => {
    let md = `# GitHub 趋势报告 - ${period}\n\n`
    
    if (data.metadata) {
      md += `## 导出信息\n\n`
      md += `- 导出时间: ${formatDate(new Date(data.metadata.exportDate))}\n`
      md += `- 时间周期: ${period}\n`
      md += `- 总项目数: ${data.metadata.totalRepositories}\n`
      md += `- 导出项目数: ${data.metadata.exportedCount}\n\n`
    }

    if (data.statistics) {
      md += `## 统计信息\n\n`
      md += `- 总 Star 数: ${data.statistics.totalStars.toLocaleString()}\n`
      md += `- 总 Fork 数: ${data.statistics.totalForks.toLocaleString()}\n`
      md += `- 总增长数: ${data.statistics.totalGrowth.toLocaleString()}\n`
      md += `- 平均 Star 数: ${data.statistics.averageStars.toLocaleString()}\n`
      md += `- 主要语言: ${data.statistics.topLanguage}\n\n`
    }

    md += `## 项目列表\n\n`
    md += `| 项目名称 | 作者 | 语言 | Stars | Forks | 增长 |\n`
    md += `|----------|------|------|-------|-------|------|\n`
    
    data.repositories.forEach((repo: any) => {
      md += `| [${repo.name}](${repo.url}) | ${repo.owner} | ${repo.language || 'N/A'} | ${repo.stars || 0} | ${repo.forks || 0} | ${repo.todayStars || 0} |\n`
    })

    return md
  }

  const convertToSQL = (data: any[]) => {
    let sql = `-- GitHub 趋势数据 SQL 导出\n`
    sql += `-- 导出时间: ${new Date().toISOString()}\n\n`
    
    sql += `CREATE TABLE IF NOT EXISTS github_repositories (\n`
    sql += `  id INTEGER PRIMARY KEY,\n`
    sql += `  name VARCHAR(255) NOT NULL,\n`
    sql += `  owner VARCHAR(255) NOT NULL,\n`
    sql += `  full_name VARCHAR(255),\n`
    sql += `  description TEXT,\n`
    sql += `  language VARCHAR(100),\n`
    sql += `  stars INTEGER DEFAULT 0,\n`
    sql += `  forks INTEGER DEFAULT 0,\n`
    sql += `  today_stars INTEGER DEFAULT 0,\n`
    sql += `  url VARCHAR(500),\n`
    sql += `  created_at DATETIME,\n`
    sql += `  updated_at DATETIME\n`
    sql += `);\n\n`

    data.forEach((repo, index) => {
      sql += `INSERT INTO github_repositories VALUES (\n`
      sql += `  ${index + 1},\n`
      sql += `  '${(repo.name || '').replace(/'/g, "''")}',\n`
      sql += `  '${(repo.owner || '').replace(/'/g, "''")}',\n`
      sql += `  '${(repo.fullName || '').replace(/'/g, "''")}',\n`
      sql += `  '${(repo.description || '').replace(/'/g, "''")}',\n`
      sql += `  '${(repo.language || '').replace(/'/g, "''")}',\n`
      sql += `  ${repo.stars || 0},\n`
      sql += `  ${repo.forks || 0},\n`
      sql += `  ${repo.todayStars || 0},\n`
      sql += `  '${(repo.url || '').replace(/'/g, "''")}',\n`
      sql += `  '${repo.createdAt || ''}',\n`
      sql += `  '${repo.updatedAt || ''}'\n`
      sql += `);\n`
    })

    return sql
  }

  return (
    <Card className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>导出数据</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
                <CardDescription>
                  自定义导出格式和内容，支持多种数据格式
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {repositories.length} 个项目
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
        {/* 导出格式选择 */}
        <div className="space-y-3">
          <Label className="text-base font-medium">导出格式</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { value: 'csv', label: 'CSV', icon: FileSpreadsheet, desc: '表格数据' },
              { value: 'json', label: 'JSON', icon: Code, desc: 'API数据' },
              { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, desc: 'Excel文件' },
              { value: 'md', label: 'Markdown', icon: FileText, desc: '文档格式' },
              { value: 'sql', label: 'SQL', icon: Database, desc: '数据库脚本' }
            ].map(format => (
              <div
                key={format.value}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  options.format === format.value 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setOptions(prev => ({ ...prev, format: format.value as any }))}
              >
                <div className="flex flex-col items-center space-y-2">
                  <format.icon className="w-6 h-6" />
                  <div className="text-center">
                    <div className="font-medium text-sm">{format.label}</div>
                    <div className="text-xs text-gray-500">{format.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* 字段选择 */}
        <div className="space-y-3">
          <Label className="text-base font-medium">导出字段</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableFields.map(field => (
              <div key={field.key} className="flex items-center space-x-2">
                <Checkbox
                  id={field.key}
                  checked={options.fields.includes(field.key)}
                  onCheckedChange={() => handleFieldToggle(field.key)}
                  disabled={field.required}
                />
                <Label 
                  htmlFor={field.key} 
                  className={`text-sm ${field.required ? 'text-gray-500' : ''}`}
                >
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* 导出选项 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">筛选选项</Label>
            
            <div className="space-y-2">
              <Label>数据范围</Label>
              <Select value={options.filterBy} onValueChange={(value: any) => setOptions(prev => ({ ...prev, filterBy: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部项目</SelectItem>
                  <SelectItem value="top">前50名</SelectItem>
                  <SelectItem value="trending">仅增长项目</SelectItem>
                  <SelectItem value="custom">自定义数量</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {options.filterBy === 'custom' && (
              <div className="space-y-2">
                <Label>导出数量</Label>
                <Input
                  type="number"
                  value={options.customLimit}
                  onChange={(e) => setOptions(prev => ({ ...prev, customLimit: parseInt(e.target.value) || 100 }))}
                  min={1}
                  max={repositories.length}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>排序方式</Label>
              <Select value={options.sortBy} onValueChange={(value: any) => setOptions(prev => ({ ...prev, sortBy: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stars">Star数量</SelectItem>
                  <SelectItem value="forks">Fork数量</SelectItem>
                  <SelectItem value="growth">增长量</SelectItem>
                  <SelectItem value="name">项目名称</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>排序顺序</Label>
              <Select value={options.sortOrder} onValueChange={(value: any) => setOptions(prev => ({ ...prev, sortOrder: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">降序</SelectItem>
                  <SelectItem value="asc">升序</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">附加内容</Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={options.includeMetadata}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeMetadata: !!checked }))}
                />
                <Label htmlFor="metadata" className="text-sm">包含导出元数据</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stats"
                  checked={options.includeStats}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeStats: !!checked }))}
                />
                <Label htmlFor="stats" className="text-sm">包含统计信息</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="charts"
                  checked={options.includeCharts}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeCharts: !!checked }))}
                  disabled={options.format !== 'json'}
                />
                <Label htmlFor="charts" className="text-sm">包含图表数据 (仅JSON)</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>分组方式</Label>
              <Select value={options.groupBy} onValueChange={(value: any) => setOptions(prev => ({ ...prev, groupBy: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不分组</SelectItem>
                  <SelectItem value="language">按语言分组</SelectItem>
                  <SelectItem value="quality">按质量分组</SelectItem>
                  <SelectItem value="trending">按趋势分组</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* 导出按钮和状态 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            将导出 <strong>{processData().length}</strong> 个项目
          </div>
          
          <div className="flex items-center space-x-3">
            {exportStatus === 'success' && (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">导出成功</span>
              </div>
            )}
            
            {exportStatus === 'error' && (
              <div className="flex items-center space-x-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">导出失败</span>
              </div>
            )}

            <Button 
              onClick={handleExport}
              disabled={isExporting || options.fields.length === 0}
              className="min-w-[120px]"
            >
              {isExporting ? (
                <>
                  <Settings className="w-4 h-4 mr-2 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  开始导出
                </>
              )}
            </Button>
          </div>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
