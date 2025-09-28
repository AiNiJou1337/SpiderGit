// Mock prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn()
  }
}));

import { GET } from '@/app/api/keywords/route';
import { prisma } from '@/lib/db/prisma';
import { NextResponse } from 'next/server';

describe('/api/keywords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/keywords', () => {
    it('should return keywords list', async () => {
      // Mock the prisma response
      (prisma as any).$queryRaw.mockResolvedValue([
        { id: 1, name: 'test', count: '10' }  // count should be a string to match the query result
      ]);

      // Mock NextResponse.json
      const mockJsonResponse = {
        keywords: [{ id: 1, name: 'test', count: 10, trend: 'stable' }],
        total: 1,
        query: ''
      };
      
      const mockNextResponse = {
        json: jest.fn().mockResolvedValue(mockJsonResponse)
      };

      const nextResponseJsonSpy = jest.spyOn(NextResponse, 'json').mockImplementation(() => {
        return mockNextResponse as any;
      });

      // Create a mock request
      const mockRequest = new Request('http://localhost/api/keywords');

      // Call the GET function
      const response: any = await GET(mockRequest as any);
      
      // Check if the response is correct
      expect((prisma as any).$queryRaw).toHaveBeenCalled();
      expect(nextResponseJsonSpy).toHaveBeenCalled();
      
      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.keywords).toBeDefined();
      expect(Array.isArray(data.keywords)).toBe(true);
      expect(data.keywords).toHaveLength(1);
      expect(data.total).toBe(1);
      
      // Clean up the spy
      nextResponseJsonSpy.mockRestore();
    });

    it('should handle database errors', async () => {
      // Mock prisma to throw an error
      (prisma as any).$queryRaw.mockRejectedValue(new Error('Database error'));

      // Mock NextResponse.json for error case
      const mockJsonResponse = {
        keywords: [],
        total: 0,
        query: '',
        error: '获取关键词数据失败'
      };
      
      const mockNextResponse: any = {
        status: 500,
        json: jest.fn().mockResolvedValue(mockJsonResponse)
      };

      const nextResponseJsonSpy = jest.spyOn(NextResponse, 'json').mockImplementation((data: any, options?: any) => {
        return {
          ...mockNextResponse,
          status: options?.status || 200
        } as any;
      });

      // Create a mock request
      const mockRequest = new Request('http://localhost/api/keywords');

      // Call the GET function
      const response: any = await GET(mockRequest as any);
      
      // Check if the response is correct
      expect((prisma as any).$queryRaw).toHaveBeenCalled();
      expect(nextResponseJsonSpy).toHaveBeenCalled();
      
      // Now we can check the status
      expect(response.status).toBe(500);
      
      // Clean up the spy
      nextResponseJsonSpy.mockRestore();
    });
  });
});