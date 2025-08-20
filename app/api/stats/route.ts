import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// 定义仓库数据接口
interface Repository {
  name: string
  stars: number
  trend_date: Date
}

// 定义趋势数据接口
interface TrendData {
  [date: string]: {
    [repo: string]: number
  }
}

// 定义响应数据接口
interface StatsResponse {
  totalRepositories: number
  totalStars: number
  totalForks: number
  trendData: Array<{  
    date: string
    [key: string]: string | number
  }>
}

export async function GET() {
  try {
    // 获取总体统计数据
    const stats = await prisma.repository.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        stars: true,
        forks: true,
      },
    })

    // 获取热门项目趋势数据（最近7天）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const trendingRepos = await prisma.repository.findMany({
      where: {
        trending: true,
        trend_date: {
          gte: sevenDaysAgo
        }
      },
      orderBy: {
        stars: 'desc'
      },
      take: 10,
      select: {
        name: true,
        stars: true,
        trend_date: true
      }
    }) as Repository[]

    // 按日期分组处理趋势数据
    const trendData = trendingRepos.reduce<TrendData>((acc, repo) => {
      const date = repo.trend_date.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {}
      }
      acc[date][repo.name] = repo.stars
      return acc
    }, {})

    // 转换为前端需要的格式
    const processedTrendData = Object.entries(trendData).map(([date, data]) => ({
      date,
      ...data as { [key: string]: number }
    }))

    const response: StatsResponse = {
      totalRepositories: stats._count.id,
      totalStars: stats._sum.stars || 0,
      totalForks: stats._sum.forks || 0,
      trendData: processedTrendData
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    )
  }
} 
