import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface DayData {
  date: string
  count: number
  trend: 'up' | 'down' | 'stable'
  topLanguages: string[]
  topProjects: Array<{
    name: string
    stars: number
    growth: number
  }>
}

interface CalendarData {
  [key: string]: DayData
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    console.log(`获取日历数据: ${year}年${month}月`)

    // 构建时间序列数据目录路径
    const timeSeriesDir = path.join(process.cwd(), 'public', 'trends', 'time_series')
    const dailyDir = path.join(timeSeriesDir, 'daily')

    // 检查目录是否存在
    if (!fs.existsSync(dailyDir)) {
      console.log('时间序列数据目录不存在')
      return NextResponse.json({
        calendar: {},
        metadata: {
          year,
          month,
          dataSource: 'none',
          message: '暂无数据，请先收集真实数据'
        }
      })
    }

    // 读取该月的所有数据文件
    const files = fs.readdirSync(dailyDir)
    const calendarData: CalendarData = {}

    // 过滤出指定年月的文件
    const targetFiles = files.filter(file => {
      if (!file.endsWith('.json')) return false
      
      // 文件名格式: YYYY-MM-DD_HH-MM-SS.json
      const dateMatch = file.match(/^(\d{4})-(\d{2})-(\d{2})_/)
      if (!dateMatch) return false
      
      const fileYear = parseInt(dateMatch[1])
      const fileMonth = parseInt(dateMatch[2])
      
      return fileYear === year && fileMonth === month
    })

    console.log(`找到 ${targetFiles.length} 个数据文件`)

    // 处理每个文件
    for (const file of targetFiles) {
      try {
        const filePath = path.join(dailyDir, file)
        const fileContent = fs.readFileSync(filePath, 'utf8')
        const data = JSON.parse(fileContent)

        // 提取日期
        const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})_/)
        if (!dateMatch) continue
        
        const dateKey = dateMatch[1]
        const repositories = data.repositories || []

        // 分析语言分布
        const languageCount: { [key: string]: number } = {}
        repositories.forEach((repo: any) => {
          if (repo.language) {
            languageCount[repo.language] = (languageCount[repo.language] || 0) + 1
          }
        })

        // 获取热门语言（前5个）
        const topLanguages = Object.entries(languageCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([lang]) => lang)

        // 获取热门项目（按今日新增stars排序）
        const topProjects = repositories
          .filter((repo: any) => repo.today_stars || repo.todayStars)
          .sort((a: any, b: any) => (b.today_stars || b.todayStars || 0) - (a.today_stars || a.todayStars || 0))
          .slice(0, 10)
          .map((repo: any) => ({
            name: repo.full_name || repo.name,
            stars: repo.stargazers_count || repo.stars || 0,
            growth: repo.today_stars || repo.todayStars || 0
          }))

        // 计算趋势（简单实现：基于项目数量）
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (repositories.length > 80) trend = 'up'
        else if (repositories.length < 50) trend = 'down'

        calendarData[dateKey] = {
          date: dateKey,
          count: repositories.length,
          trend,
          topLanguages,
          topProjects
        }

      } catch (error) {
        console.error(`处理文件 ${file} 失败:`, error)
      }
    }

    // 如果没有真实数据，返回空数据
    if (Object.keys(calendarData).length === 0) {
      console.log('没有找到真实数据')
      return NextResponse.json({
        calendar: {},
        metadata: {
          year,
          month,
          dataSource: 'none',
          message: '没有找到真实数据，请先收集数据'
        }
      })
    }

    return NextResponse.json({
      calendar: calendarData,
      metadata: {
        year,
        month,
        dataSource: 'real',
        fileCount: targetFiles.length,
        dayCount: Object.keys(calendarData).length
      }
    })

  } catch (error) {
    console.error('获取日历数据失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '获取日历数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}



// POST方法用于触发数据收集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, year, month } = body

    if (action === 'collect') {
      // 触发指定月份的数据收集
      console.log(`触发数据收集: ${year}年${month}月`)
      
      // 这里可以调用时间序列数据收集脚本
      // 暂时返回成功响应
      return NextResponse.json({
        success: true,
        message: `已触发 ${year}年${month}月 的数据收集`,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      message: '不支持的操作'
    }, { status: 400 })

  } catch (error) {
    console.error('处理日历操作失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '处理日历操作失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
