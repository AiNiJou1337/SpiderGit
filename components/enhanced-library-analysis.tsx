'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { ExternalLink, Download } from 'lucide-react'

interface EnhancedLibraryAnalysisProps {
  keyword?: string
  title?: string
  libraryData?: Record<string, number>
}

interface FileInfo {
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
  functions: number
  components: number
  apiEndpoints: number
  allImportedLibraries: string[]
}

export function EnhancedLibraryAnalysis({ 
  keyword, 
  title = '常用库/包分析',
  libraryData: initialLibraryData
}: EnhancedLibraryAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [libraries, setLibraries] = useState<Record<string, number>>(initialLibraryData || {})
  const [librariesByLanguage, setLibrariesByLanguage] = useState<Record<string, Record<string, number>>>({})
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [totalFiles, setTotalFiles] = useState(0)
  
  // 文件列表对话框状态
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filesList, setFilesList] = useState<FileInfo[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [totalLibraryFiles, setTotalLibraryFiles] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageLimit] = useState(10)
  
  // 使用ref跟踪组件是否挂载
  const isMounted = useRef(true);
  // 使用ref存储当前关键词，用于防止请求竞争
  const currentKeyword = useRef(keyword);

  // 颜色配置
  const colors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', 
    '#FF6B6B', '#4BC0C0', '#FF9F40', '#9966FF', '#FF6699',
    '#36A2EB', '#FF6384', '#4BC0C0', '#FF9F40', '#9966FF'
  ]

  // 组件挂载/卸载处理
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 当关键词变化时，更新currentKeyword ref
  useEffect(() => {
    if (keyword) {
      currentKeyword.current = keyword;
    }
  }, [keyword]);

  // 获取库分析数据
  useEffect(() => {
    // 如果有初始数据或没有关键词，不需要获取数据
    if (initialLibraryData || !keyword) return;

    const fetchLibraryData = async () => {
      setLoading(true);
      setError(null);
      // 存储这次请求的关键词，用于后续比对
      const requestKeyword = keyword;

      try {
        const response = await fetch(
          `/api/libraries?keyword=${encodeURIComponent(keyword)}${selectedLanguage !== 'all' ? `&language=${selectedLanguage}` : ''}`
        );
        
        // 如果组件已卸载或关键词已变更，不处理结果
        if (!isMounted.current || currentKeyword.current !== requestKeyword) {
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '获取库分析数据失败');
        }
        
        const data = await response.json();
        
        // 再次检查组件挂载状态和关键词
        if (!isMounted.current || currentKeyword.current !== requestKeyword) {
          return;
        }
        
        setLibraries(data.libraries || {});
        setLibrariesByLanguage(data.librariesByLanguage || {});
        setAvailableLanguages(['all', ...(data.availableLanguages || [])]);
        setTotalFiles(data.totalFiles || 0);
        
      } catch (err) {
        if (isMounted.current && currentKeyword.current === requestKeyword) {
          setError((err as Error).message || '未知错误');
          console.error('获取库分析失败:', err);
        }
      } finally {
        if (isMounted.current && currentKeyword.current === requestKeyword) {
          setLoading(false);
        }
      }
    };

    fetchLibraryData();
  }, [keyword, selectedLanguage, initialLibraryData]);

  // 获取使用特定库的文件列表
  const fetchLibraryFiles = async (library: string, page: number = 1) => {
    if (!keyword) return;
    
    setFilesLoading(true);
    setFilesError(null);
    
    try {
      const response = await fetch(
        `/api/libraries/files?keyword=${encodeURIComponent(keyword)}&library=${encodeURIComponent(library)}${selectedLanguage !== 'all' ? `&language=${selectedLanguage}` : ''}&page=${page}&limit=${pageLimit}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取文件列表失败');
      }
      
      const data = await response.json();
      setFilesList(data.files || []);
      setTotalLibraryFiles(data.totalFiles || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || 1);
      
    } catch (err) {
      setFilesError((err as Error).message || '未知错误');
      console.error('获取文件列表失败:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  // 处理库点击事件
  const handleLibraryClick = (libraryName: string) => {
    setSelectedLibrary(libraryName);
    setIsDialogOpen(true);
    fetchLibraryFiles(libraryName);
  };

  // 处理分页变化
  const handlePageChange = (page: number) => {
    if (selectedLibrary) {
      setCurrentPage(page);
      fetchLibraryFiles(selectedLibrary, page);
    }
  };

  // 准备图表数据
  const prepareChartData = () => {
    const librariesToUse = 
      selectedLanguage === 'all' || initialLibraryData
        ? libraries 
        : librariesByLanguage[selectedLanguage] || {};
    
    // 确保数据非空并格式化
    if (Object.keys(librariesToUse).length === 0) {
      return [];
    }
    
    return Object.entries(librariesToUse)
      .map(([name, count]) => ({ 
        name: name || '未命名库', 
        count: count || 0 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);  // 显示前20个
  }

  const chartData = prepareChartData();

  // 添加自定义tick渲染函数
  const CustomizedYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={-10} 
          y={0} 
          dy={4} 
          textAnchor="end" 
          fill="#666"
          style={{ fontSize: '12px' }}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  // 渲染加载状态
  if (loading && Object.keys(libraries).length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 渲染错误
  if (error && Object.keys(libraries).length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 p-4">
            <p>{error}</p>
            <p className="mt-2 text-sm">请尝试刷新页面或稍后再试</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-row justify-between items-center">
            <CardTitle>{title}</CardTitle>
            <div className="flex items-center gap-2">
              {!initialLibraryData && availableLanguages.length > 0 && (
                <>
                  <span className="text-sm text-gray-500">语言:</span>
                  <Select
                    value={selectedLanguage}
                    onValueChange={setSelectedLanguage}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="选择语言" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages.map(lang => (
                        <SelectItem key={lang} value={lang}>
                          {lang === 'all' ? '所有语言' : lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {keyword && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = `/api/export/analysis?keyword=${encodeURIComponent(keyword)}&includeFiles=true`}
                  >
                    导出分析数据
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = `/api/export/analysis?all=true&includeFiles=true`}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    导出所有关键词
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}
          
          {!chartData.length ? (
            <div className="text-center py-4 text-gray-500">没有库/包分析数据</div>
          ) : (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData} 
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
                >
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={150}
                    tick={CustomizedYAxisTick}
                    interval={0}
                    tickLine={false}
                    axisLine={true}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} 个文件中使用`, '使用频率']}
                    labelFormatter={(label) => `库: ${label}`}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                    onClick={(data) => handleLibraryClick(data.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartData.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">库/包使用统计</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {chartData.map((item, index) => (
                  <div 
                    key={item.name}
                    className="flex justify-between items-center p-2 rounded border cursor-pointer hover:bg-gray-50"
                    onClick={() => handleLibraryClick(item.name)}
                  >
                    <span className="font-medium" style={{ color: colors[index % colors.length] }}>
                      {item.name}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {item.count} 次
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedLibrary ? `使用 "${selectedLibrary}" 的文件列表` : '文件列表'}
            </DialogTitle>
            <DialogDescription>
              共找到 {totalLibraryFiles} 个文件使用此库
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end mb-4">
            {selectedLibrary && keyword && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = `/api/export/analysis?keyword=${encodeURIComponent(keyword)}&library=${encodeURIComponent(selectedLibrary)}&includeFiles=true`}
              >
                导出文件列表
              </Button>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-auto">
            {filesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : filesError ? (
              <div className="text-red-500 p-4">
                <p>{filesError}</p>
              </div>
            ) : filesList.length === 0 ? (
              <p className="text-center py-4 text-gray-500">没有找到文件</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>文件名</TableHead>
                    <TableHead>路径</TableHead>
                    <TableHead>仓库</TableHead>
                    <TableHead>语言</TableHead>
                    <TableHead>星标</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filesList.map(file => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">{file.filename}</TableCell>
                      <TableCell>{file.path}</TableCell>
                      <TableCell>
                        <a 
                          href={file.repository.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          {file.repository.fullName}
                          <ExternalLink size={14} />
                        </a>
                      </TableCell>
                      <TableCell>{file.repository.language || '-'}</TableCell>
                      <TableCell>{file.repository.stars}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  // 计算要显示的页码
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        href="#" 
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                          e.preventDefault();
                          handlePageChange(pageNum);
                        }}
                        isActive={pageNum === currentPage}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                      e.preventDefault();
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}