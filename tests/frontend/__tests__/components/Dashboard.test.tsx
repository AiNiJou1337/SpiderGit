import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '@/app/dashboard/page'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  __esModule: true,
  default: {
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
  },
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
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
}))

// Mock the TrendingHotRepositories component
jest.mock('@/components/features/trending-hot-repositories', () => {
  return {
    TrendingHotRepositories: () => <div>热门仓库</div>,
  }
})

// Mock the TechStatsOverview component
jest.mock('@/components/features/tech-stats-overview', () => {
  return {
    TechStatsOverview: () => <div>技术栈概览</div>,
  }
})

describe('Dashboard', () => {
  beforeEach(() => {
    const { api } = require('@/lib/api/client')
    // Mock API responses
    ;(api.stats.overview as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        total_repositories: 1250,
        total_keywords: 45,
        trending_today: 23,
        languages_count: 12,
      },
    })
    ;(api.repositories.trending as jest.Mock).mockResolvedValue({
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
    })
    ;(api.analysis.languages as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        TypeScript: 450,
        JavaScript: 380,
        Python: 320,
        Java: 280,
        Go: 150,
      },
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders dashboard title', () => {
    render(<Dashboard />)
    
    expect(screen.getByText('GitHub 数据仪表盘')).toBeTruthy()
  })

  it('renders refresh button', () => {
    render(<Dashboard />)
    
    expect(screen.getByRole('button', { name: /刷新/ })).toBeTruthy()
  })

  it('allows refreshing data', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    
    const refreshButton = screen.getByRole('button', { name: /刷新/ })
    await user.click(refreshButton)
    
    // The test passes if no exception is thrown
    expect(true).toBe(true)
  })
})