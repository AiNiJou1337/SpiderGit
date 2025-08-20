// API 相关类型定义

export interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  stars?: number  // 兼容爬取数据格式
  forks?: number  // 兼容爬取数据格式
  forks_count?: number  // 兼容GitHub API格式
  language: string | null
  created_at: string
  updated_at: string
  topics: string[]
  url?: string  // 兼容爬取数据格式
  owner?: string  // 兼容爬取数据格式
  default_branch?: string  // 支持默认分支
}

export interface Keyword {
  id: number
  name: string
  category: string
  created_at: string
  updated_at: string
}

export interface TrendData {
  date: string
  repositories: Repository[]
  total_count: number
  languages: Record<string, number>
}

export interface LibraryAnalysis {
  library_name: string
  usage_count: number
  percentage: number
  repositories: string[]
  language: string
}

export interface LibraryUsage {
  library_name: string
  usage_count: number
  percentage: number
  repositories: string[]
  language: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// API 请求参数类型
export interface TrendingParams {
  language?: string
  since?: 'daily' | 'weekly' | 'monthly'
  page?: number
  limit?: number
}

export interface KeywordSearchParams {
  query: string
  language?: string
  sort?: 'stars' | 'updated' | 'created'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface AnalysisParams {
  startDate?: string
  endDate?: string
  languages?: string[]
  keywords?: string[]
}
