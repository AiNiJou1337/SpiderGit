import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 获取所有关键词
export async function GET(request: Request) {
  try {
    const keywords = await prisma.keyword.findMany({
      select: {
        text: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({
      keywords: keywords.map(k => k.text),
      total: keywords.length
    });
  } catch (error) {
    console.error('获取关键词列表失败:', error);
    return NextResponse.json(
      { error: '获取关键词列表失败' },
      { status: 500 }
    );
  }
} 