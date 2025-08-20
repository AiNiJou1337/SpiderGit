// 数据库模型类型定义

export interface DbRepository {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  language: string | null
  created_at: Date
  updated_at: Date
  scraped_at: Date
  topics: string[]
  readme_content?: string
  code_analysis?: CodeAnalysisResult
}

export interface DbKeyword {
  id: number
  name: string
  category: string
  is_active: boolean
  created_at: Date
  updated_at: Date
  repositories?: DbRepository[]
}

export interface DbTrendRecord {
  id: number
  date: Date
  repository_id: number
  keyword_id: number
  rank: number
  stars_count: number
  language: string | null
  created_at: Date
}

export interface CodeAnalysisResult {
  languages: Record<string, number>
  libraries: LibraryUsage[]
  complexity_score: number
  file_count: number
  total_lines: number
}

export interface LibraryUsage {
  name: string
  language: string
  usage_count: number
  files: string[]
  version?: string
}

// Prisma 生成的类型扩展
export interface RepositoryWithRelations extends DbRepository {
  keywords: DbKeyword[]
  trend_records: DbTrendRecord[]
}

export interface KeywordWithRelations extends DbKeyword {
  repositories: DbRepository[]
  trend_records: DbTrendRecord[]
}

// 数据库查询选项
export interface QueryOptions {
  include?: {
    keywords?: boolean
    repositories?: boolean
    trend_records?: boolean
  }
  where?: Record<string, any>
  orderBy?: Record<string, 'asc' | 'desc'>
  take?: number
  skip?: number
}

// 数据库操作结果
export interface DbOperationResult<T> {
  success: boolean
  data?: T
  error?: string
  affected_rows?: number
}
