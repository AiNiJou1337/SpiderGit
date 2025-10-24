'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ExternalLink, Search, FileText, RefreshCw } from 'lucide-react'
import { getLanguageColor } from '@/lib/utils/language-colors'

interface FileUsageInfo {
  id: string
  filename: string
  path: string
  repository: {
    id: string
    name: string
    owner: string
    fullName: string
    language: string
    stars: number
    url: string
  }
  functions?: number
  components?: number
  apiEndpoints?: number
}

// 修改props接口，移除不可序列化的函数
interface LibraryFileUsageDialogProps {
  open: boolean
  keyword: string
  library: string
  libraryDisplayName?: string
}

// 添加一个hook来处理对话框的打开/关闭状态
interface UseDialogStateProps {
  open: boolean
  onOpenChangeProp?: ((open: boolean) => void) | null
}

function useDialogState({ open, onOpenChangeProp }: UseDialogStateProps) {
  const [isOpen, setIsOpen] = useState(open)
  
  useEffect(() => {
    setIsOpen(open)
  }, [open])
  
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    if (onOpenChangeProp) {
      onOpenChangeProp(newOpen)
    }
  }
  
  return { isOpen, handleOpenChange }
}

export function LibraryFileUsageDialog({
  open,
  keyword,
  library,
  libraryDisplayName,
  onOpenChange
}: LibraryFileUsageDialogProps & { onOpenChange?: (open: boolean) => void }) {
  const { isOpen, handleOpenChange } = useDialogState({ open, onOpenChangeProp: onOpenChange || null })
  const [files, setFiles] = useState<FileUsageInfo[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileUsageInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [totalFiles, setTotalFiles] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // 获取文件使用数据
  const fetchFileUsage = async (page = 1) => {
    if (!keyword || !library) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        keyword,
        library,
        page: page.toString(),
        limit: '20'
      })

      if (selectedLanguage !== 'all') {
        params.append('language', selectedLanguage)
      }

      const response = await fetch(`/api/libraries/files?${params}`)
      if (!response.ok) {
        throw new Error('获取文件数据失败')
      }

      const data = await response.json()
      setFiles(data.files || [])
      setTotalFiles(data.totalFiles || 0)
      setCurrentPage(data.page || 1)
      setTotalPages(data.totalPages || 1)
      
      // 记录数据来源
      if (data.dataSource) {
        console.log(`📊 数据来源: ${data.dataSource}`)
      }
    } catch (error) {
      console.error('获取文件使用数据失败:', error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  // 当对话框打开时获取数据
  useEffect(() => {
    if (isOpen) {
      fetchFileUsage(1)
    }
  }, [isOpen, keyword, library, selectedLanguage])

  // 搜索过滤
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(files)
    } else {
      const filtered = files.filter(file =>
        file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.repository.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.repository.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredFiles(filtered)
    }
  }, [files, searchQuery])

  // 获取唯一的编程语言列表
  const availableLanguages = Array.from(new Set(files.map(f => f.repository.language).filter(Boolean)))

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            使用 "{libraryDisplayName || library}" 的文件列表
          </DialogTitle>
          <DialogDescription>
            关键词: {keyword} | 共找到 {totalFiles} 个文件
          </DialogDescription>
        </DialogHeader>

        {/* 搜索和过滤器 */}
        <div className="flex gap-4 py-4 border-b">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索文件名、路径或仓库..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择语言" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有语言</SelectItem>
              {availableLanguages.map(lang => (
                <SelectItem key={lang} value={lang}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getLanguageColor(lang) }}
                    />
                    {lang}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFileUsage(currentPage)}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* 文件列表表格 */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>加载文件数据中...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>文件名</TableHead>
                  <TableHead>文件路径</TableHead>
                  <TableHead>所属仓库</TableHead>
                  <TableHead>语言</TableHead>
                  <TableHead>星标</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      {file.filename}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={file.path}>
                      {file.path}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{file.repository.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getLanguageColor(file.repository.language) }}
                        />
                        <span className="text-sm">{file.repository.language}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        ⭐ {file.repository.stars?.toLocaleString() || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.repository.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredFiles.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold mb-2">
                {searchQuery ? '没有找到匹配的文件' : '暂无文件级别的数据'}
              </p>
              <p className="text-sm mb-4">
                该关键词的数据中不包含详细的代码文件分析信息
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-amber-800 font-medium mb-2">📌 如何获取准确数据？</p>
                <ol className="text-sm text-amber-700 text-left list-decimal list-inside space-y-1">
                  <li>返回Keywords页面</li>
                  <li>选择该关键词并点击"重新爬取"</li>
                  <li>等待爬取完成（会自动分析代码文件）</li>
                  <li>刷新页面查看详细的文件级别数据</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              第 {currentPage} 页，共 {totalPages} 页 | 显示 {filteredFiles.length} / {totalFiles} 个文件
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchFileUsage(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchFileUsage(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}