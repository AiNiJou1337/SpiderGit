import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'daily' // 默认为每日趋势
    const language = searchParams.get('language')
    
    // 读取趋势数据
    const dataPath = path.join(process.cwd(), 'public', 'analytics', 'trends.json')
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({
        repositories: [],
        languages: []
      }, { status: 404 })
    }
    
    const trendsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    
    // 获取对应时间段的趋势数据
    let repositories = trendsData[period] || []
    
    // 如果指定了语言，进行筛选
    if (language) {
      repositories = repositories.filter((repo: any) => 
        repo.language && repo.language.toLowerCase() === language.toLowerCase()
      )
    }
    
    // 提取所有可用的语言列表
    const allLanguages = new Set<string>()
    trendsData[period]?.forEach((repo: any) => {
      if (repo.language) {
        allLanguages.add(repo.language)
      }
    })
    
    return NextResponse.json({
      repositories,
      languages: Array.from(allLanguages)
    })
  } catch (error) {
    console.error('获取趋势数据失败:', error)
    return NextResponse.json({
      repositories: [],
      languages: []
    }, { status: 500 })
  }
}