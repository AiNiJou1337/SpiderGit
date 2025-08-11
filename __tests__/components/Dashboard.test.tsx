/**
 * 仪表盘页面组件测试
 * 测试主要的数据展示和交互功能
 */

import { render, screen, waitFor } from '@testing-library/react'

// Mock fetch API
global.fetch = jest.fn()

// Mock Recharts 图表组件
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: any) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  PieChart: ({ children }: any) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}))

// Mock Next.js 主题
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}))

describe('仪表盘页面测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock 成功的 API 响应
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalRepositories: 1250,
            totalKeywords: 35,
            totalTasks: 18,
            completedTasks: 15,
            failedTasks: 2,
            averageStars: 2150
          })
        })
      }

      if (url.includes('/api/repositories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            repositories: [
              {
                id: 1,
                name: 'next.js',
                owner: 'vercel',
                stars: 118000,
                language: 'JavaScript',
                description: 'The React Framework'
              },
              {
                id: 2,
                name: 'react',
                owner: 'facebook',
                stars: 220000,
                language: 'JavaScript',
                description: 'A declarative, efficient, and flexible JavaScript library'
              }
            ]
          })
        })
      }
      
      if (url.includes('/api/keywords')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            keywords: [
              { id: 1, text: 'react', createdAt: '2024-01-01' },
              { id: 2, text: 'nextjs', createdAt: '2024-01-02' },
              { id: 3, text: 'typescript', createdAt: '2024-01-03' }
            ]
          })
        })
      }

      // 默认返回空响应
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    })
  })

  it('应该渲染仪表盘基本结构', async () => {
    // 动态导入组件以避免 SSR 问题
    const Dashboard = (await import('@/app/dashboard/page')).default
    render(<Dashboard />)

    // 检查页面标题
    expect(screen.getByText('GitHub 趋势分析仪表盘')).toBeInTheDocument()
  })

  it('应该显示统计数据', async () => {
    const Dashboard = (await import('@/app/dashboard/page')).default
    render(<Dashboard />)

    await waitFor(() => {
      // 检查统计数字是否显示
      expect(screen.getByText('1250')).toBeInTheDocument() // totalRepositories
      expect(screen.getByText('35')).toBeInTheDocument()   // totalKeywords
      expect(screen.getByText('18')).toBeInTheDocument()   // totalTasks
    }, { timeout: 3000 })
  })

  it('应该优雅处理 API 错误', async () => {
    // Mock API 错误
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'))

    const Dashboard = (await import('@/app/dashboard/page')).default
    render(<Dashboard />)

    await waitFor(() => {
      // 应该显示错误状态或加载失败信息
      expect(screen.getByText(/加载失败|错误|Error/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('应该渲染图表组件', async () => {
    const Dashboard = (await import('@/app/dashboard/page')).default
    render(<Dashboard />)

    await waitFor(() => {
      // 检查图表容器是否存在
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('应该显示仓库信息', async () => {
    const Dashboard = (await import('@/app/dashboard/page')).default
    render(<Dashboard />)

    await waitFor(() => {
      // 检查是否显示了仓库名称
      expect(screen.getByText('next.js')).toBeInTheDocument()
      expect(screen.getByText('react')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
