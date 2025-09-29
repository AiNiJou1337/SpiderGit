'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronUp,
  Star,
  GitFork,
  Filter,
  Download,
  Search,
  RefreshCw,
  ArrowUpDown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { formatNumber } from '@/lib/utils/helpers'
import { getLanguageColor } from '@/lib/utils/language-colors'
import type { Repository } from '@/types/api'

interface RepositoryListProps {
  repositories?: Repository[]
  loading?: boolean
  showFilters?: boolean
  showPagination?: boolean
  className?: string
  keyword?: string // 添加 keyword 属性
}

export default function RepositoryList({
  repositories = [],
  loading = false,
  showFilters = true,
  showPagination = true,
  className,
  keyword = '' // 添加 keyword 参数
}: RepositoryListProps) {

  const [sortBy, setSortBy] = useState<'stars' | 'updated' | 'created'>('stars')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  // 获取所有语言选项 - 使用useMemo优化
  const languages = useMemo(() => {
    return Array.from(
      new Set(repositories.map(repo => repo.language).filter(Boolean))
    ).sort()
  }, [repositories])

  // 过滤和排序逻辑 - 使用useMemo优化
  const filteredRepos = useMemo(() => {
    let filtered = [...repositories]

    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // 语言过滤
    if (languageFilter !== 'all') {
      filtered = filtered.filter(repo => repo.language === languageFilter)
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'stars':
          aValue = a.stars || a.stargazers_count || 0
          bValue = b.stars || b.stargazers_count || 0
          break
        case 'updated':
          aValue = new Date(a.updated_at).getTime()
          bValue = new Date(b.updated_at).getTime()
          break
        case 'created':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          aValue = a.stars || a.stargazers_count || 0
          bValue = b.stars || b.stargazers_count || 0
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [repositories, searchQuery, languageFilter, sortBy, sortOrder])

  // 重置页码当过滤条件改变时
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, languageFilter, sortBy, sortOrder])

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      // 清理任何可能的异步操作或事件监听器
      // 这里暂时为空，但为将来的清理操作预留位置
    }
  }, [])

  // 分页逻辑 - 使用useMemo优化
  const { totalPages, paginatedRepos, startIndex } = useMemo(() => {
    const total = Math.ceil(filteredRepos.length / itemsPerPage)
    const start = (currentPage - 1) * itemsPerPage
    const paginated = filteredRepos.slice(start, start + itemsPerPage)
    return { totalPages: total, paginatedRepos: paginated, startIndex: start }
  }, [filteredRepos, currentPage, itemsPerPage])

  const handleSort = useCallback((field: 'stars' | 'updated' | 'created') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }, [sortBy, sortOrder])

  const getSortIcon = useCallback((field: 'stars' | 'updated' | 'created') => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4" />
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }, [sortBy, sortOrder])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>仓库列表</CardTitle>
          <CardDescription>正在加载仓库数据...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>加载中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {keyword ? `"${keyword}" 相关仓库` : '仓库列表'}
            </CardTitle>
            <CardDescription>
              {keyword ?
                `找到 ${repositories.length} 个与 "${keyword}" 相关的仓库` :
                `共 ${filteredRepos.length} 个仓库`
              }
              {repositories.length !== filteredRepos.length &&
                ` (显示 ${filteredRepos.length} 个)`
              }
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 过滤器 */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索仓库名称或描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="选择语言" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有语言</SelectItem>
                {languages.map((lang, langIndex) => (
                  <SelectItem key={`lang-${langIndex}-${lang || 'unknown'}`} value={lang || 'unknown'}>{lang || '未知'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 表格 */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">项目</TableHead>
                <TableHead className="w-[300px]">描述</TableHead>
                <TableHead className="w-[100px]">语言</TableHead>
                <TableHead className="w-[120px]">作者</TableHead>
                <TableHead
                  className="w-[100px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleSort('stars')}
                >
                  <div className="flex items-center">
                    星标 {getSortIcon('stars')}
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">分支</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRepos.map((repo, index) => {
                // 防御性编程：确保repo对象存在且有必要的属性
                if (!repo || !repo.name) return null

                return (
                  <TableRow
                    key={`${repo.id || index}-${repo.full_name || repo.name}-${index}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                  {/* 项目名称 */}
                  <TableCell>
                    <a
                      href={repo.html_url || repo.url || `https://github.com/${repo.full_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {repo.name}
                    </a>
                  </TableCell>

                  {/* 描述 */}
                  <TableCell>
                    <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {repo.description || '暂无描述'}
                    </div>
                    {repo.topics && repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {repo.topics.slice(0, 2).map((topic, topicIndex) => (
                          <Badge key={`${repo.id}-topic-${topicIndex}-${topic}`} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                        {repo.topics.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{repo.topics.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* 语言 */}
                  <TableCell>
                    {repo.language && (
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getLanguageColor(repo.language) }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {repo.language}
                        </span>
                      </div>
                    )}
                  </TableCell>

                  {/* 作者 */}
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {repo.full_name ?
                        repo.full_name.split('/')[0] :
                        (typeof repo.owner === 'string' ? repo.owner :
                         typeof repo.owner === 'object' && repo.owner && (repo.owner as any).login ? (repo.owner as any).login :
                         'Unknown')
                      }
                    </span>
                  </TableCell>

                  {/* 星标 */}
                  <TableCell>
                    <div className="flex items-center text-yellow-600">
                      <Star className="w-4 h-4 mr-1 fill-current" />
                      <span className="text-sm font-medium">
                        {formatNumber(repo.stars || repo.stargazers_count || 0)}
                      </span>
                    </div>
                  </TableCell>

                  {/* 分支 */}
                  <TableCell>
                    <div className="flex items-center text-gray-600">
                      <GitFork className="w-4 h-4 mr-1" />
                      <span className="text-sm">
                        {formatNumber(repo.forks || repo.forks_count || 0)}
                      </span>
                    </div>
                  </TableCell>

                  {/* 操作 - 下载ZIP */}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        // 下载ZIP文件的URL格式，支持默认分支
                        const repoUrl = repo.html_url || repo.url || `https://github.com/${repo.full_name}`
                        const defaultBranch = repo.default_branch || 'main'
                        const downloadUrl = `${repoUrl}/archive/refs/heads/${defaultBranch}.zip`
                        window.open(downloadUrl, '_blank')
                      }}
                      title="下载ZIP文件"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* 空状态 */}
        {!loading && paginatedRepos.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchQuery || languageFilter !== 'all' ?
                '没有找到匹配的仓库，请尝试调整筛选条件' :
                '暂无仓库数据'
              }
            </p>
          </div>
        )}

        {/* 分页 */}
        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              显示 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRepos.length)} 
              / 共 {filteredRepos.length} 个
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
