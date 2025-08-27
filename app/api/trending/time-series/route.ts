import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface TimeSeriesData {
  timestamp: string
  period: string
  count: number
  repositories: any[]
  metadata: {
    collectionTime: string
    apiVersion: string
    dataVersion: string
  }
}

interface TimeSeriesQuery {
  period?: 'daily' | 'weekly' | 'monthly'
  startDate?: string
  endDate?: string
  limit?: number
  language?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const query: TimeSeriesQuery = {
      period: (searchParams.get('period') as 'daily' | 'weekly' | 'monthly') || 'daily',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: parseInt(searchParams.get('limit') || '10'),
      language: searchParams.get('language') || undefined
    }

    console.log('🔍 时间序列查询参数:', query)

    // 构建数据目录路径
    const timeSeriesDir = path.join(process.cwd(), 'public', 'trends', 'time_series')
    const periodDir = path.join(timeSeriesDir, query.period)

    // 检查目录是否存在
    if (!fs.existsSync(periodDir)) {
      return NextResponse.json({
        success: false,
        message: `时间序列数据目录不存在: ${query.period}`,
        data: []
      })
    }

    // 获取所有数据文件
    const files = fs.readdirSync(periodDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a)) // 按时间倒序排列

    console.log(`📁 找到 ${files.length} 个 ${query.period} 数据文件`)

    // 解析时间范围
    let startDate: Date | undefined
    let endDate: Date | undefined

    if (query.startDate) {
      startDate = new Date(query.startDate)
    }
    if (query.endDate) {
      endDate = new Date(query.endDate)
    }

    // 过滤和读取文件
    const timeSeriesData: TimeSeriesData[] = []
    let processedCount = 0

    for (const file of files) {
      if (processedCount >= query.limit) break

      try {
        // 从文件名解析时间戳
        const filename = file.replace('.json', '')
        const fileDate = new Date(filename.replace('_', 'T').replace(/-/g, ':'))

        // 检查时间范围
        if (startDate && fileDate < startDate) continue
        if (endDate && fileDate > endDate) continue

        // 读取文件数据
        const filePath = path.join(periodDir, file)
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const data: TimeSeriesData = JSON.parse(fileContent)

        // 语言过滤
        if (query.language) {
          data.repositories = data.repositories.filter(repo => 
            repo.language && repo.language.toLowerCase() === query.language.toLowerCase()
          )
          data.count = data.repositories.length
        }

        timeSeriesData.push(data)
        processedCount++

      } catch (error) {
        console.error(`读取文件 ${file} 失败:`, error)
        continue
      }
    }

    // 生成统计信息
    const statistics = {
      totalSnapshots: timeSeriesData.length,
      dateRange: {
        start: timeSeriesData.length > 0 ? timeSeriesData[timeSeriesData.length - 1].timestamp : null,
        end: timeSeriesData.length > 0 ? timeSeriesData[0].timestamp : null
      },
      totalRepositories: timeSeriesData.reduce((sum, data) => sum + data.count, 0),
      averageRepositoriesPerSnapshot: timeSeriesData.length > 0 
        ? Math.round(timeSeriesData.reduce((sum, data) => sum + data.count, 0) / timeSeriesData.length)
        : 0
    }

    // 语言统计
    const languageStats: { [key: string]: number } = {}
    timeSeriesData.forEach(snapshot => {
      snapshot.repositories.forEach(repo => {
        if (repo.language) {
          languageStats[repo.language] = (languageStats[repo.language] || 0) + 1
        }
      })
    })

    const topLanguages = Object.entries(languageStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([language, count]) => ({ language, count }))

    console.log(`✅ 返回 ${timeSeriesData.length} 个时间序列数据点`)

    return NextResponse.json({
      success: true,
      message: `成功获取 ${query.period} 时间序列数据`,
      data: timeSeriesData,
      statistics,
      topLanguages,
      query
    })

  } catch (error) {
    console.error('获取时间序列数据失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '获取时间序列数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'collect') {
      // 触发数据收集
      console.log('🚀 触发时间序列数据收集...')
      
      return NextResponse.json({
        success: true,
        message: '时间序列数据收集已触发',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      message: '不支持的操作'
    }, { status: 400 })

  } catch (error) {
    console.error('处理时间序列操作失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '处理时间序列操作失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
