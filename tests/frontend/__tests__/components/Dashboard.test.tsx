import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '@/app/dashboard/page'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  api: {
    stats: {
      overview: jest.fn(),
    },
    repositories: {
      trending: jest.fn(),
    },
    analysis: {
      languages: jest.fn(),
    },
  },
}))

// Mock chart components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
}))

const mockStatsData = {
  success: true,
  data: {
    total_repositories: 1250,
    total_keywords: 45,
    trending_today: 23,
    languages_count: 12,
  },
}

const mockTrendingData = {
  success: true,
  data: [
    {
      id: 1,
      name: 'awesome-project',
      full_name: 'user/awesome-project',
      description: 'An awesome project',
      stargazers_count: 1500,
      language: 'TypeScript',
      html_url: 'https://github.com/user/awesome-project',
    },
  ],
}

const mockLanguagesData = {
  success: true,
  data: {
    TypeScript: 450,
    JavaScript: 380,
    Python: 320,
    Java: 280,
    Go: 150,
  },
}

describe('Dashboard', () => {
  beforeEach(() => {
    const { api } = require('@/lib/api/client')
    api.stats.overview.mockResolvedValue(mockStatsData)
    api.repositories.trending.mockResolvedValue(mockTrendingData)
    api.analysis.languages.mockResolvedValue(mockLanguagesData)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders dashboard title', async () => {
    render(<Dashboard />)
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/GitHub 趋势数据概览/)).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    render(<Dashboard />)
    
    expect(screen.getByText(/加载中/)).toBeInTheDocument()
  })

  it('displays stats cards after loading', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument() // total_repositories
      expect(screen.getByText('45')).toBeInTheDocument() // total_keywords
      expect(screen.getByText('23')).toBeInTheDocument() // trending_today
      expect(screen.getByText('12')).toBeInTheDocument() // languages_count
    })
  })

  it('displays trending repositories', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('awesome-project')).toBeInTheDocument()
      expect(screen.getByText('An awesome project')).toBeInTheDocument()
      expect(screen.getByText('1,500')).toBeInTheDocument() // stars count
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
    })
  })

  it('displays language distribution chart', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    const { api } = require('@/lib/api/client')
    api.stats.overview.mockRejectedValue(new Error('API Error'))
    
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText(/加载失败/)).toBeInTheDocument()
    })
  })

  it('allows refreshing data', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument()
    })
    
    const refreshButton = screen.getByRole('button', { name: /刷新/ })
    await user.click(refreshButton)
    
    const { api } = require('@/lib/api/client')
    expect(api.stats.overview).toHaveBeenCalledTimes(2)
  })

  it('filters repositories by language', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('awesome-project')).toBeInTheDocument()
    })
    
    const languageFilter = screen.getByRole('combobox', { name: /语言筛选/ })
    await user.selectOptions(languageFilter, 'TypeScript')
    
    const { api } = require('@/lib/api/client')
    expect(api.repositories.trending).toHaveBeenCalledWith('TypeScript')
  })
})
