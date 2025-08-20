import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/keywords/route'

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    keyword: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

describe('/api/keywords', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/keywords', () => {
    it('should return keywords list', async () => {
      const mockKeywords = [
        { id: 1, name: 'react', category: 'frontend', created_at: new Date() },
        { id: 2, name: 'nodejs', category: 'backend', created_at: new Date() },
      ]

      const { prisma } = require('@/lib/db/prisma')
      prisma.keyword.findMany.mockResolvedValue(mockKeywords)

      const request = new NextRequest('http://localhost:3000/api/keywords')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockKeywords)
      expect(prisma.keyword.findMany).toHaveBeenCalledWith({
        orderBy: { created_at: 'desc' }
      })
    })

    it('should handle database errors', async () => {
      const { prisma } = require('@/lib/db/prisma')
      prisma.keyword.findMany.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/keywords')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Database error')
    })
  })

  describe('POST /api/keywords', () => {
    it('should create a new keyword', async () => {
      const newKeyword = { name: 'vue', category: 'frontend' }
      const createdKeyword = { id: 3, ...newKeyword, created_at: new Date() }

      const { prisma } = require('@/lib/db/prisma')
      prisma.keyword.create.mockResolvedValue(createdKeyword)

      const request = new NextRequest('http://localhost:3000/api/keywords', {
        method: 'POST',
        body: JSON.stringify(newKeyword),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(createdKeyword)
      expect(prisma.keyword.create).toHaveBeenCalledWith({
        data: newKeyword
      })
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/keywords', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('required')
    })

    it('should handle duplicate keywords', async () => {
      const { prisma } = require('@/lib/db/prisma')
      prisma.keyword.create.mockRejectedValue(new Error('Unique constraint failed'))

      const request = new NextRequest('http://localhost:3000/api/keywords', {
        method: 'POST',
        body: JSON.stringify({ name: 'react', category: 'frontend' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toContain('already exists')
    })
  })
})
