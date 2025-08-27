import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 开始运行连接测试...')

    const results = {
      timestamp: new Date().toISOString(),
      status: 'success',
      data: {
        tokenLoading: false,
        apiConnection: false,
        simpleSearch: false,
        rateLimit: null,
        error: null
      }
    }

    try {
      // 运行Python连接测试脚本
      const { stdout, stderr } = await execAsync('python tests/scripts/simple-connection-test.py', {
        cwd: process.cwd(),
        timeout: 60000, // 1分钟超时
        env: { ...process.env }
      })

      console.log('连接测试输出:', stdout)
      if (stderr) {
        console.error('连接测试错误:', stderr)
      }

      // 解析测试结果
      const testResults = parseConnectionTestOutput(stdout)
      results.data = { ...results.data, ...testResults }

      // 保存测试结果
      await saveConnectionTestResults(results)

      return NextResponse.json({
        success: true,
        message: '连接测试完成',
        data: results.data
      })

    } catch (error: any) {
      console.error('连接测试执行失败:', error)
      
      results.status = 'failed'
      results.data.error = error.message

      return NextResponse.json({
        success: false,
        message: '连接测试失败',
        data: results.data,
        error: error.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('处理连接测试请求失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '处理连接测试请求失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

function parseConnectionTestOutput(output: string) {
  const results = {
    tokenLoading: false,
    apiConnection: false,
    simpleSearch: false,
    rateLimit: null,
    error: null
  }

  try {
    // 首先尝试解析JSON结果
    const jsonMatch = output.match(/📋 JSON结果:\s*(\{[\s\S]*?\})\s*(?:\n|$)/)
    if (jsonMatch) {
      try {
        const jsonResult = JSON.parse(jsonMatch[1])
        results.tokenLoading = jsonResult.tokenLoading || false
        results.apiConnection = jsonResult.apiConnection || false
        results.simpleSearch = jsonResult.simpleSearch || false
        results.rateLimit = jsonResult.rateLimit || null

        console.log('成功解析JSON结果:', jsonResult)
        return results
      } catch (jsonError) {
        console.error('JSON解析失败，使用文本解析:', jsonError)
      }
    }

    // 如果JSON解析失败，使用文本解析
    // 解析Token加载结果
    if (output.includes('✅ 找到Token:') || output.includes('Token加载: ✅ 通过')) {
      results.tokenLoading = true
    }

    // 解析API连接结果
    if (output.includes('✅ GitHub API连接成功') || output.includes('API连接: ✅ 通过')) {
      results.apiConnection = true
    }

    // 解析搜索测试结果
    if (output.includes('✅ 搜索成功') || output.includes('简单搜索: ✅ 通过')) {
      results.simpleSearch = true
    }

    // 解析API速率限制
    const rateLimitMatch = output.match(/API速率限制:\s*(\d+)\/(\d+)\s*剩余/)
    if (rateLimitMatch) {
      results.rateLimit = {
        remaining: parseInt(rateLimitMatch[1]),
        limit: parseInt(rateLimitMatch[2])
      }
    }

    // 检查错误信息
    if (output.includes('❌')) {
      const errorLines = output.split('\n').filter(line =>
        line.includes('❌') && !line.includes('总体结果')
      )
      if (errorLines.length > 0) {
        results.error = errorLines.slice(0, 3).join('; ') // 只取前3个错误
      }
    }

  } catch (error) {
    console.error('解析连接测试输出失败:', error)
    results.error = '解析测试结果失败'
  }

  return results
}

async function saveConnectionTestResults(results: any) {
  try {
    const fs = require('fs')
    const resultsDir = path.join(process.cwd(), 'tests', 'results')
    
    // 确保结果目录存在
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `connection-test-${timestamp}.json`
    const filepath = path.join(resultsDir, filename)

    fs.writeFileSync(filepath, JSON.stringify(results, null, 2))
    console.log(`🔗 连接测试结果已保存到: ${filepath}`)
  } catch (error) {
    console.error('保存连接测试结果失败:', error)
  }
}

// GET方法用于获取最新的连接测试结果
export async function GET(request: NextRequest) {
  try {
    const fs = require('fs')
    const resultsDir = path.join(process.cwd(), 'tests', 'results')
    
    if (!fs.existsSync(resultsDir)) {
      return NextResponse.json({
        success: true,
        data: {
          tokenLoading: false,
          apiConnection: false,
          simpleSearch: false,
          rateLimit: null,
          error: '暂无测试结果'
        }
      })
    }

    // 获取最新的连接测试结果文件
    const files = fs.readdirSync(resultsDir)
      .filter((file: string) => file.startsWith('connection-test-') && file.endsWith('.json'))
      .sort()
      .reverse()

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          tokenLoading: false,
          apiConnection: false,
          simpleSearch: false,
          rateLimit: null,
          error: '暂无测试结果'
        }
      })
    }

    const latestFile = path.join(resultsDir, files[0])
    const content = fs.readFileSync(latestFile, 'utf8')
    const results = JSON.parse(content)

    return NextResponse.json({
      success: true,
      data: results.data,
      timestamp: results.timestamp
    })

  } catch (error) {
    console.error('获取连接测试结果失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '获取连接测试结果失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
