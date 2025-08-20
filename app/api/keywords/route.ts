import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// 获取所有关键词
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const q = searchParams.get('q');
    
    // 构建查询条件
    let where = {};
    if (q) {
      where = {
        text: {
          contains: q,
          mode: 'insensitive'
        }
      };
    }

    // 获取关键词及其出现次数
    let keywordsData;
    if (q) {
      keywordsData = await prisma.$queryRaw`
        SELECT k.id, k.text as name, COUNT(rk."keywordId") as count
        FROM "keywords" k
        JOIN "repository_keywords" rk ON k.id = rk."keywordId"
        WHERE k.text ILIKE ${`%${q}%`}
        GROUP BY k.id, k.text
        ORDER BY count DESC
        LIMIT ${limit}
      `;
    } else {
      keywordsData = await prisma.$queryRaw`
        SELECT k.id, k.text as name, COUNT(rk."keywordId") as count
        FROM "keywords" k
        JOIN "repository_keywords" rk ON k.id = rk."keywordId"
        GROUP BY k.id, k.text
        ORDER BY count DESC
        LIMIT ${limit}
      `;
    }

    // 构造响应数据
    const keywords = (keywordsData as any[]).map(k => ({
      id: k.id,
      name: k.name,
      count: Number(k.count),
      trend: Math.random() > 0.5 ? 'up' : (Math.random() > 0.5 ? 'down' : 'stable')
    }));

    return NextResponse.json({
      keywords,
      total: keywords.length,
      query: q || ''
    });
  } catch (error) {
    console.error('获取关键词数据失败:', error);
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    
    return NextResponse.json(
      { 
        keywords: [],
        total: 0,
        query: query,
        error: '获取关键词数据失败' 
      },
      { status: 500 }
    );
  }
} 