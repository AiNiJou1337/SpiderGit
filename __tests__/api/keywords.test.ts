/**
 * 关键词 API 路由测试
 * 测试 /api/keywords 的基本功能
 */

// Mock Prisma 数据库
jest.mock('@/lib/db', () => ({
  prisma: {
    keyword: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    crawlTask: {
      create: jest.fn(),
    },
    repositoryKeyword: {
      count: jest.fn(),
    },
  },
}))

// Mock child_process（爬虫执行）
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, options, callback) => {
    // 模拟成功执行
    if (typeof options === 'function') {
      callback = options
    }
    if (callback) {
      setTimeout(() => callback(null, 'Mock crawler output', ''), 100)
    }
  }),
}))

// Mock 路径解析工具
jest.mock('@/lib/python-resolver', () => ({
  resolvePythonBin: jest.fn().mockResolvedValue('python'),
}))

// 创建一个模拟的 NextRequest 对象
const createMockNextRequest = (url: string, init?: RequestInit) => {
  const request = new Request(url, init) as any;
  request.nextUrl = new URL(url);
  return request;
};

describe('Keywords API 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/keywords - 获取关键词列表', () => {
    it('应该返回关键词列表', async () => {
      const { prisma } = require('@/lib/db')

      // Mock 数据
      const mockKeywords = [
        { id: 1, text: 'react', createdAt: new Date('2024-01-01') },
        { id: 2, text: 'nextjs', createdAt: new Date('2024-01-02') },
        { id: 3, text: 'typescript', createdAt: new Date('2024-01-03') },
      ]

      prisma.keyword.findMany.mockResolvedValue(mockKeywords)
      prisma.repositoryKeyword.count.mockResolvedValue(150)

      // 动态导入 API 路由
      const { GET } = await import('@/app/api/keywords/route')
      const request = createMockNextRequest('http://localhost:3000/api/keywords')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.keywords).toHaveLength(3)
      expect(data.keywords[0].text).toBe('react')
      expect(data.keywords[1].text).toBe('nextjs')
    })

    it('应该处理数据库错误', async () => {
      const { prisma } = require('@/lib/db')

      prisma.keyword.findMany.mockRejectedValue(new Error('Database connection failed'))

      const { GET } = await import('@/app/api/keywords/route')
      const request = createMockNextRequest('http://localhost:3000/api/keywords')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('获取关键词列表失败')
    })

    it('应该返回空列表当没有关键词时', async () => {
      const { prisma } = require('@/lib/db')

      prisma.keyword.findMany.mockResolvedValue([])
      prisma.repositoryKeyword.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/keywords/route')
      const request = createMockNextRequest('http://localhost:3000/api/keywords')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.keywords).toHaveLength(0)
    })
  })

  describe('POST /api/keywords/search - 关键词搜索和爬取', () => {
    it('应该创建新的爬取任务', async () => {
      const { prisma } = require('@/lib/db')

      const mockKeyword = { id: 1, text: 'vue', createdAt: new Date() }
      const mockTask = { id: 1, status: 'pending', progress: 0 }

      prisma.keyword.findUnique.mockResolvedValue(null)
      prisma.keyword.create.mockResolvedValue(mockKeyword)
      prisma.crawlTask.create.mockResolvedValue(mockTask)

      const { POST } = await import('@/app/api/keywords/search/route')
      const request = createMockNextRequest('http://localhost:3000/api/keywords/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: 'vue',
          languages: ['javascript', 'typescript'],
          limits: { javascript: 30, typescript: 20 }
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('爬取任务已启动')
      expect(data.taskId).toBe(1)
    })

    it('应该验证必填字段', async () => {
      const { POST } = await import('@/app/api/keywords/search/route')
      const request = createMockNextRequest('http://localhost:3000/api/keywords/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('关键词不能为空')
    })

    it('应该处理已存在的关键词', async () => {
      const { prisma } = require('@/lib/db')

      const existingKeyword = { id: 1, text: 'react', createdAt: new Date() }
      const mockTask = { id: 2, status: 'pending', progress: 0 }

      prisma.keyword.findUnique.mockResolvedValue(existingKeyword)
      prisma.crawlTask.create.mockResolvedValue(mockTask)

      const { POST } = await import('@/app/api/keywords/search/route')
      const request = createMockNextRequest('http://localhost:3000/api/keywords/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: 'react' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('爬取任务已启动')
      // 应该使用现有关键词而不是创建新的
      expect(prisma.keyword.create).not.toHaveBeenCalled()
    })
  })
})