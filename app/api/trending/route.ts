import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 使用lib/db.ts中的prisma实例

export async function GET(request: Request) {
  try {
    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily';
    const language = searchParams.get('language');
    const limit = parseInt(searchParams.get('limit') || '25');
    
    // 构建查询条件
    const where: any = {
      trending: true,
      trendPeriod: period,
    };
    
    // 如果指定了语言，添加语言过滤条件
    if (language && language !== 'all') {
      where.language = language;
      
      // 支持模糊匹配，例如搜索'java'也能匹配'javascript'
      // 如果需要精确匹配，可以使用 where.language = language;
      // where.language = {
      //   contains: language,
      //   mode: 'insensitive' // 不区分大小写
      // };
    }
    
    // 查询数据库
    const repositories = await prisma.repository.findMany({
      where,
      orderBy: {
        stars: 'desc',
      },
      take: limit,
    });
    
    // 获取可用的语言列表
    const languages = await prisma.repository.findMany({
      where: {
        trending: true,
        trendPeriod: period,
        language: {
          not: null,
        },
      },
      select: {
        language: true,
      },
      distinct: ['language'],
    });
    
    return NextResponse.json({
      repositories,
      languages: languages.map(l => l.language).filter(Boolean),
      period,
      total: repositories.length,
    });
  } catch (error) {
    console.error('获取趋势仓库失败:', error);
    return NextResponse.json(
      { error: '获取趋势仓库失败' },
      { status: 500 }
    );
  }
}