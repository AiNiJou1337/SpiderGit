import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keyword = 'react', language = 'javascript', maxResults = 10, includeAnalysis = false } = body

    console.log(`🕷️ 开始运行爬虫测试: ${keyword} (${language})`)

    const results = {
      timestamp: new Date().toISOString(),
      status: 'success',
      config: { keyword, language, maxResults, includeAnalysis },
      data: {
        totalRepositories: 0,
        successfulParsing: 0,
        failedParsing: 0,
        dataQuality: 0,
        executionTime: 0,
        outputFiles: [],
        errors: []
      }
    }

    try {
      const startTime = Date.now()

      // 构建爬虫测试命令
      const command = buildCrawlerCommand(keyword, language, maxResults, includeAnalysis)
      
      // 执行爬虫测试
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 300000, // 5分钟超时
        env: { ...process.env }
      })

      const executionTime = Date.now() - startTime

      console.log('爬虫测试输出:', stdout)
      if (stderr) {
        console.error('爬虫测试错误:', stderr)
      }

      // 解析测试结果
      const testResults = await parseCrawlerTestOutput(stdout, stderr, executionTime)
      results.data = { ...results.data, ...testResults }

      // 保存测试结果
      await saveCrawlerTestResults(results)

      return NextResponse.json({
        success: true,
        message: `爬虫测试完成，成功爬取 ${results.data.totalRepositories} 个仓库`,
        data: results.data
      })

    } catch (error: any) {
      console.error('爬虫测试执行失败:', error)
      
      results.status = 'failed'
      results.data.errors.push(error.message)

      return NextResponse.json({
        success: false,
        message: '爬虫测试失败',
        data: results.data,
        error: error.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('处理爬虫测试请求失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '处理爬虫测试请求失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

function buildCrawlerCommand(keyword: string, language: string, maxResults: number, includeAnalysis: boolean): string {
  // 构建Python爬虫测试命令
  let command = `python -m backend.scraper.crawlers.keyword_scraper "${keyword}"`
  
  if (language && language !== 'all') {
    command += ` --language ${language}`
  }
  
  if (maxResults > 0) {
    command += ` --max-results ${maxResults}`
  }
  
  if (includeAnalysis) {
    command += ` --analyze-code`
  }
  
  // 添加输出目录
  command += ` --output-dir tests/results/crawler`
  
  // 添加测试模式标志
  command += ` --test-mode`
  
  return command
}

async function parseCrawlerTestOutput(stdout: string, stderr: string, executionTime: number) {
  const results = {
    totalRepositories: 0,
    successfulParsing: 0,
    failedParsing: 0,
    dataQuality: 0,
    executionTime,
    outputFiles: [],
    errors: []
  }

  try {
    // 解析仓库数量
    const repoCountMatch = stdout.match(/成功爬取\s*(\d+)\s*个仓库/)
    if (repoCountMatch) {
      results.totalRepositories = parseInt(repoCountMatch[1])
    }

    // 解析成功解析数量
    const successMatch = stdout.match(/成功解析\s*(\d+)\s*个/)
    if (successMatch) {
      results.successfulParsing = parseInt(successMatch[1])
    }

    // 解析失败数量
    const failedMatch = stdout.match(/解析失败\s*(\d+)\s*个/)
    if (failedMatch) {
      results.failedParsing = parseInt(failedMatch[1])
    }

    // 计算数据质量分数
    if (results.totalRepositories > 0) {
      results.dataQuality = Math.round((results.successfulParsing / results.totalRepositories) * 100)
    }

    // 查找输出文件
    const outputDir = path.join(process.cwd(), 'tests', 'results', 'crawler')
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir)
        .filter(file => file.endsWith('.json') || file.endsWith('.csv'))
        .map(file => ({
          name: file,
          path: path.join(outputDir, file),
          size: fs.statSync(path.join(outputDir, file)).size
        }))
      results.outputFiles = files
    }

    // 收集错误信息
    if (stderr) {
      results.errors.push(stderr)
    }

    const errorLines = stdout.split('\n').filter(line => 
      line.includes('错误') || line.includes('失败') || line.includes('ERROR')
    )
    results.errors.push(...errorLines)

  } catch (error) {
    console.error('解析爬虫测试输出失败:', error)
    results.errors.push('解析测试结果失败')
  }

  return results
}

async function saveCrawlerTestResults(results: any) {
  try {
    const resultsDir = path.join(process.cwd(), 'tests', 'results')
    
    // 确保结果目录存在
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `crawler-test-${timestamp}.json`
    const filepath = path.join(resultsDir, filename)

    fs.writeFileSync(filepath, JSON.stringify(results, null, 2))
    console.log(`🕷️ 爬虫测试结果已保存到: ${filepath}`)
  } catch (error) {
    console.error('保存爬虫测试结果失败:', error)
  }
}

// GET方法用于获取最新的爬虫测试结果
export async function GET(request: NextRequest) {
  try {
    const resultsDir = path.join(process.cwd(), 'tests', 'results')
    
    if (!fs.existsSync(resultsDir)) {
      return NextResponse.json({
        success: true,
        data: {
          totalRepositories: 0,
          successfulParsing: 0,
          failedParsing: 0,
          dataQuality: 0,
          executionTime: 0,
          outputFiles: [],
          errors: ['暂无测试结果']
        }
      })
    }

    // 获取最新的爬虫测试结果文件
    const files = fs.readdirSync(resultsDir)
      .filter(file => file.startsWith('crawler-test-') && file.endsWith('.json'))
      .sort()
      .reverse()

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalRepositories: 0,
          successfulParsing: 0,
          failedParsing: 0,
          dataQuality: 0,
          executionTime: 0,
          outputFiles: [],
          errors: ['暂无测试结果']
        }
      })
    }

    const latestFile = path.join(resultsDir, files[0])
    const content = fs.readFileSync(latestFile, 'utf8')
    const results = JSON.parse(content)

    return NextResponse.json({
      success: true,
      data: results.data,
      config: results.config,
      timestamp: results.timestamp
    })

  } catch (error) {
    console.error('获取爬虫测试结果失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '获取爬虫测试结果失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
