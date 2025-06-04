'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Table, 
  TableBody, 
  TableCaption, 
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
  ExternalLink, 
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

interface Repository {
  id: number
  name: string
  owner: string
  fullName?: string
  description: string
  language: string
  stars: number
  forks: number
  url: string
  tags: string[]
}

// 添加语言颜色映射
const languageColors: { [key: string]: string } = {
  "Python": "bg-green-100 text-green-800",
  "TypeScript": "bg-blue-100 text-blue-800",
  "JavaScript": "bg-yellow-100 text-yellow-800",
  "Java": "bg-orange-100 text-orange-800",
  "Go": "bg-cyan-100 text-cyan-800",
  "Rust": "bg-red-100 text-red-800",
  "C++": "bg-purple-100 text-purple-800",
  "C": "bg-gray-100 text-gray-800",
  "PHP": "bg-indigo-100 text-indigo-800",
  "Ruby": "bg-pink-100 text-pink-800",
  "Lua": "bg-violet-100 text-violet-800",
  "Shell": "bg-emerald-100 text-emerald-800"
}

// 获取语言对应的颜色类名
const getLanguageColorClass = (language: string) => {
  return languageColors[language] || "bg-gray-100 text-gray-800"
}

interface RepositoryListProps {
  repositories: Repository[]
  keyword?: string
  initialSortBy?: 'stars' | 'forks' | 'name'
  initialOrder?: 'asc' | 'desc'
}

export function RepositoryList({ 
  repositories = [],
  keyword = '',
  initialSortBy = 'stars', 
  initialOrder = 'desc' 
}: RepositoryListProps) {
  const [filteredRepositories, setFilteredRepositories] = useState<Repository[]>([])
  const [sortBy, setSortBy] = useState<'stars' | 'forks' | 'name'>(initialSortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialOrder)
  const [languages, setLanguages] = useState<string[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [pendingZipUrls, setPendingZipUrls] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // 组件挂载状态追踪
  const isMounted = useRef(true);

  // 组件挂载/卸载处理
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 初始化时获取语言列表和进行排序
  useEffect(() => {
    if (!repositories || repositories.length === 0 || !isMounted.current) return;
    
    // 提取所有语言并按字母顺序排序
    const uniqueLanguages = Array.from(
      new Set(repositories.map(repo => repo.language).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    
    if (isMounted.current) {
      setLanguages(uniqueLanguages);
    }

    // 应用排序和筛选
    const sortAndFilter = () => {
      let filtered = [...repositories];
      
      // 应用语言筛选
      if (selectedLanguage !== 'all') {
        filtered = filtered.filter(repo => repo.language === selectedLanguage);
      }
      
      // 应用排序
      filtered.sort((a, b) => {
        if (sortBy === 'name') {
          return sortOrder === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        } else {
          const aValue = a[sortBy] || 0;
          const bValue = b[sortBy] || 0;
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }
      });
      
      if (isMounted.current) {
        setFilteredRepositories(filtered);
      }
    };

    sortAndFilter();
  }, [repositories, sortBy, sortOrder, selectedLanguage]);

  // 处理语言选择变化
  const handleLanguageChange = (value: string) => {
    if (isMounted.current) {
      setSelectedLanguage(value);
    }
  };

  // 处理排序
  const handleSort = (column: 'stars' | 'forks' | 'name') => {
    if (!isMounted.current) return;
    
    if (sortBy === column) {
      // 如果已经按该列排序，则切换顺序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 否则，切换到该列排序，并设置默认顺序
      setSortBy(column)
      setSortOrder(column === 'name' ? 'asc' : 'desc') // 名称默认升序，其他默认降序
    }
  }

  // 获取仓库ZIP下载链接
  const getDownloadZipUrl = async (owner: string, name: string) => {
    // 设置正在获取状态
    const repoKey = `${owner}/${name}`;
    if (pendingZipUrls[repoKey]) return;
    
    if (isMounted.current) {
      setPendingZipUrls(prev => ({ ...prev, [repoKey]: true }));
    }
    
    // 首先尝试获取仓库的默认分支
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${name}`)
      const data = await response.json()
      
      if (!isMounted.current) return;
      
      if (data.default_branch) {
        const zipUrl = `https://github.com/${owner}/${name}/archive/refs/heads/${data.default_branch}.zip`;
        window.open(zipUrl, '_blank');
        return;
      }
    } catch (error) {
      console.error('获取仓库默认分支失败:', error)
    } finally {
      if (isMounted.current) {
        setPendingZipUrls(prev => ({ ...prev, [repoKey]: false }));
      }
    }

    // 如果无法获取默认分支或已卸载，则使用默认分支
    if (isMounted.current) {
      const defaultZipUrl = `https://github.com/${owner}/${name}/archive/refs/heads/main.zip`;
      window.open(defaultZipUrl, '_blank');
    }
  }

  // 排序图标
  const SortIcon = ({ column }: { column: 'stars' | 'forks' | 'name' }) => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
  }

  // 过滤和排序仓库
  useEffect(() => {
    if (!isMounted.current) return
    
    setIsLoading(true)
    
    // 延迟处理以避免阻塞UI
    const timer = setTimeout(() => {
      // 首先按搜索词过滤
      let results = repositories.filter(repo => {
        if (!searchTerm) return true
        
        const search = searchTerm.toLowerCase()
        return (
          repo.name.toLowerCase().includes(search) ||
          repo.description?.toLowerCase().includes(search) ||
          repo.language?.toLowerCase().includes(search) ||
          repo.owner?.toLowerCase().includes(search) ||
          repo.tags?.some(tag => tag.toLowerCase().includes(search))
        )
      })
      
      // 然后排序
      results = [...results].sort((a, b) => {
        if (sortBy === 'stars') {
          return sortOrder === 'asc' ? a.stars - b.stars : b.stars - a.stars
        } else if (sortBy === 'forks') {
          return sortOrder === 'asc' ? a.forks - b.forks : b.forks - a.forks
        } else {
          return sortOrder === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)
        }
      })
      
      // 只有在组件仍然挂载时才更新状态
      if (isMounted.current) {
        setFilteredRepositories(results)
        setIsLoading(false)
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [repositories, searchTerm, sortBy, sortOrder])

  // 如果没有仓库
  if (repositories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>项目列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            没有找到相关仓库
          </div>
        </CardContent>
      </Card>
    )
  }

  // 计算页面上实际展示的仓库数量
  const displayedCount = filteredRepositories?.length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row justify-between items-center">
          <CardTitle>项目列表 ({displayedCount})</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select
              value={selectedLanguage}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择编程语言" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部语言</SelectItem>
                {languages.map(lang => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription>
          包含关键词 "{keyword}" 的GitHub项目
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="搜索仓库名称、描述、语言或标签..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-auto">
          <Table>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  <span className="mt-2 block text-sm text-muted-foreground">加载中...</span>
                </TableCell>
              </TableRow>
            ) : filteredRepositories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <span className="text-muted-foreground">无匹配结果</span>
                </TableCell>
              </TableRow>
            ) : (
              <>
                <TableHeader>
                  <TableRow>
                    <TableHead>项目</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>语言</TableHead>
                    <TableHead className="w-[100px]">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-1 h-8 px-2"
                      >
                        <span>作者</span>
                        <SortIcon column="name" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('stars')}
                        className="flex items-center space-x-1 h-8 px-2"
                      >
                        <span>星标</span>
                        <SortIcon column="stars" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('forks')}
                        className="flex items-center space-x-1 h-8 px-2"
                      >
                        <span>分支</span>
                        <SortIcon column="forks" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[100px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRepositories.map((repo) => (
                    <TableRow key={repo.id}>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        <a 
                          href={repo.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center"
                        >
                          {repo.name}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {repo.description || '无描述'}
                      </TableCell>
                      <TableCell>
                        {repo.language && (
                          <Badge className={getLanguageColorClass(repo.language)}>
                            {repo.language}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{repo.owner}</TableCell>
                      <TableCell>
                        <span className="flex items-center">
                          <Star className="mr-1 h-4 w-4 text-yellow-500" />
                          {repo.stars.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center">
                          <GitFork className="mr-1 h-4 w-4 text-blue-500" />
                          {repo.forks.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => getDownloadZipUrl(repo.owner, repo.name)}
                          title="下载ZIP压缩包"
                          disabled={pendingZipUrls[`${repo.owner}/${repo.name}`]}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 