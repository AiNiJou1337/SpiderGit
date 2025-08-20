// 组件相关类型定义

import { ReactNode } from 'react'
import { Repository, Keyword, LibraryUsage, LibraryAnalysis } from './api'

// 通用组件 Props
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
}

// 图表组件类型
export interface ChartDataPoint {
  name: string
  value: number
  color?: string
}

export interface TrendChartProps extends BaseComponentProps {
  data: ChartDataPoint[]
  title?: string
  height?: number
  showLegend?: boolean
}

export interface LanguageChartProps extends BaseComponentProps {
  data: Record<string, number>
  title?: string
  type?: 'bar' | 'pie' | 'line'
}

export interface LibraryChartProps extends BaseComponentProps {
  libraries: LibraryUsage[]
  language?: string
  limit?: number
}

// 功能组件类型
export interface KeywordCloudProps extends BaseComponentProps {
  keywords: string[]
  onKeywordClick?: (keyword: string) => void
  maxItems?: number
}

export interface RepositoryListProps extends BaseComponentProps {
  repositories: Repository[]
  loading?: boolean
  onRepositoryClick?: (repository: Repository) => void
  showPagination?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export interface RepositoryCardProps extends BaseComponentProps {
  repository: Repository
  onClick?: () => void
  showAnalysis?: boolean
}

// 布局组件类型
export interface NavbarProps extends BaseComponentProps {
  currentPath?: string
  user?: {
    name: string
    avatar?: string
  }
}

export interface SidebarProps extends BaseComponentProps {
  isOpen: boolean
  onToggle: () => void
  navigation: NavigationItem[]
}

export interface NavigationItem {
  name: string
  href: string
  icon?: ReactNode
  badge?: string | number
  children?: NavigationItem[]
}

// 表单组件类型
export interface SearchFormProps extends BaseComponentProps {
  onSearch: (query: string, filters: SearchFilters) => void
  loading?: boolean
  placeholder?: string
}

export interface SearchFilters {
  language?: string
  dateRange?: {
    start: Date
    end: Date
  }
  sortBy?: 'stars' | 'updated' | 'created'
  order?: 'asc' | 'desc'
}

// 状态管理类型
export interface AppState {
  repositories: Repository[]
  keywords: Keyword[]
  loading: boolean
  error: string | null
  filters: SearchFilters
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
  }
}

export interface AppAction {
  type: string
  payload?: any
}

// 主题类型
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system'
  colors: {
    primary: string
    secondary: string
    background: string
    foreground: string
  }
}

// 导入重用的类型
// 类型已在顶部导入，无需重复导出
