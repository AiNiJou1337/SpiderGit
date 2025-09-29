import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'daily' // 默认为每日趋势
    const language = searchParams.get('language')
    const refresh = searchParams.get('refresh') === 'true'
    const useTimeSeries = searchParams.get('timeSeries') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')

    console.log(`获取 ${period} 趋势数据, 语言: ${language || '全部'}, 限制: ${limit}, 时间序列: ${useTimeSeries}`)

    // 如果启用时间序列，尝试从时间序列数据获取最新数据
    if (useTimeSeries) {
      try {
        const timeSeriesDir = path.join(process.cwd(), 'public', 'analytics', 'time_series', period)

        if (fs.existsSync(timeSeriesDir)) {
          const files = fs.readdirSync(timeSeriesDir)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a)) // 按时间倒序排列

          if (files.length > 0) {
            // 获取最新的时间序列数据
            const latestFile = files[0] ? path.join(timeSeriesDir, files[0]) : '';
            if (!latestFile) {
              throw new Error('No latest file found');
            }
            const timeSeriesData = JSON.parse(fs.readFileSync(latestFile, 'utf8'))

            let repositories = timeSeriesData.repositories || []

            // 语言过滤
            if (language && language !== 'all') {
              repositories = repositories.filter((repo: any) =>
                repo.language && repo.language.toLowerCase() === language.toLowerCase()
              )
            }

            // 限制数量
            repositories = repositories.slice(0, limit)

            // 提取语言列表
            const allLanguages = new Set<string>()
            timeSeriesData.repositories?.forEach((repo: any) => {
              if (repo.language) {
                allLanguages.add(repo.language)
              }
            })

            console.log(`从时间序列数据返回 ${repositories.length} 个仓库`)

            return NextResponse.json({
              repositories,
              languages: Array.from(allLanguages).sort(),
              metadata: {
                lastUpdated: timeSeriesData.timestamp,
                count: repositories.length,
                period: period,
                totalCount: timeSeriesData.count,
                isDemo: false,
                dataSource: 'time_series',
                collectionTime: timeSeriesData.metadata?.collectionTime
              }
            })
          }
        }
      } catch (error) {
        console.warn('获取时间序列数据失败，回退到主数据文件:', error)
      }
    }

    // 读取趋势数据
    const dataPath = path.join(process.cwd(), 'public', 'trends', 'data', 'trends.json')

    // 如果请求刷新或文件不存在，尝试生成新数据
    if (refresh || !fs.existsSync(dataPath)) {
      console.log('🔄 开始获取最新趋势数据...')

      try {
        // 优先使用时间序列数据管理器
        const pythonPath = process.env.PYTHON_BIN || 'python'
        const timeSeriesScriptPath = path.join(process.cwd(), 'backend', 'scraper', 'time_series_trending_manager.py')
        const fallbackScriptPath = path.join(process.cwd(), 'backend', 'scraper', 'trending_manager.py')

        const childEnv = {
          ...process.env,
          GITHUB_TOKEN_PQG: process.env.GITHUB_TOKEN_PQG || '',
          GITHUB_TOKEN_LR: process.env.GITHUB_TOKEN_LR || '',
          GITHUB_TOKEN_HXZ: process.env.GITHUB_TOKEN_HXZ || '',
          GITHUB_TOKEN_XHY: process.env.GITHUB_TOKEN_XHY || '',
        }

        // 异步执行，不等待完成（避免超时）
        if (refresh) {
          // 优先尝试时间序列管理器
          if (fs.existsSync(timeSeriesScriptPath)) {
            exec(`${pythonPath} "${timeSeriesScriptPath}"`, { env: childEnv }, (error, stdout, stderr) => {
              if (error) {
                console.error(`时间序列数据更新错误: ${error.message}`)
                // 回退到原始管理器
                exec(`${pythonPath} "${fallbackScriptPath}"`, { env: childEnv }, (fallbackError, fallbackStdout, fallbackStderr) => {
                  if (fallbackError) {
                    console.error(`回退数据更新错误: ${fallbackError.message}`)
                  } else {
                    console.log('✅ 回退趋势数据更新完成')
                  }
                })
              } else {
                console.log('✅ 时间序列趋势数据更新完成')
              }
            })
          } else {
            // 使用原始管理器
            exec(`${pythonPath} "${fallbackScriptPath}"`, { env: childEnv }, (error, stdout, stderr) => {
              if (error) {
                console.error(`趋势数据更新错误: ${error.message}`)
              } else {
                console.log('✅ 趋势数据更新完成')
              }
            })
          }
        }

      } catch (error) {
        console.error('启动趋势数据更新失败:', error)
      }
    }

    // 读取现有数据（如果存在）
    if (!fs.existsSync(dataPath)) {
      // 如果文件不存在，返回模拟数据
      return NextResponse.json({
        repositories: generateMockData(period),
        languages: ['JavaScript', 'Python', 'TypeScript', 'Go', 'Rust', 'Java'],
        metadata: {
          lastUpdated: new Date().toISOString(),
          count: 20,
          period: period,
          isDemo: true
        }
      })
    }

    const trendsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

    // 获取对应时间段的趋势数据
    let repositories = trendsData[period] || []

    // 如果指定了语言，进行筛选
    if (language && language !== 'all') {
      repositories = repositories.filter((repo: any) =>
        repo.language && repo.language.toLowerCase() === language.toLowerCase()
      )
    }

    // 限制数量
    repositories = repositories.slice(0, limit)

    // 提取所有可用的语言列表
    const allLanguages = new Set<string>()
    trendsData[period]?.forEach((repo: any) => {
      if (repo.language) {
        allLanguages.add(repo.language)
      }
    })

    console.log(`从主数据文件返回 ${repositories.length} 个仓库`)

    return NextResponse.json({
      repositories,
      languages: Array.from(allLanguages).sort(),
      metadata: {
        lastUpdated: trendsData.lastUpdated || new Date().toISOString(),
        count: repositories.length,
        period: period,
        totalCount: trendsData.metadata?.totalCount || 0,
        isDemo: false,
        dataSource: 'main_file'
      }
    })
  } catch (error) {
    console.error('获取趋势数据失败:', error)

    // 返回错误时提供模拟数据
    return NextResponse.json({
      repositories: generateMockData(request.nextUrl.searchParams.get('period') || 'daily'),
      languages: ['JavaScript', 'Python', 'TypeScript'],
      metadata: {
        lastUpdated: new Date().toISOString(),
        count: 10,
        period: request.nextUrl.searchParams.get('period') || 'daily',
        isDemo: true,
        error: 'Failed to load real data, showing demo data'
      }
    }, { status: 200 }) // 返回200状态码，但标记为demo数据
  }
}

// 生成模拟数据的函数
function generateMockData(period: string) {
  const mockRepos = [
    {
      id: 1,
      name: 'awesome-project',
      owner: 'github',
      fullName: 'github/awesome-project',
      description: `A ${period} trending project for demonstration`,
      language: 'JavaScript',
      stars: Math.floor(Math.random() * 10000) + 1000,
      forks: Math.floor(Math.random() * 1000) + 100,
      todayStars: Math.floor(Math.random() * 100) + 10,
      url: 'https://github.com/github/awesome-project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trendPeriod: period
    },
    {
      id: 2,
      name: 'trending-tool',
      owner: 'microsoft',
      fullName: 'microsoft/trending-tool',
      description: `Popular ${period} tool`,
      language: 'Python',
      stars: Math.floor(Math.random() * 8000) + 500,
      forks: Math.floor(Math.random() * 800) + 50,
      todayStars: Math.floor(Math.random() * 80) + 5,
      url: 'https://github.com/microsoft/trending-tool',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trendPeriod: period
    }
  ]

  return mockRepos
}