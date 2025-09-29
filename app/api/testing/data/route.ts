import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

// GET - 获取测试数据统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log(`📊 获取测试数据: type=${type}, days=${days}, limit=${limit}`)

    // 调用Python数据管理器获取统计信息
    const command = `python tests/scripts/test-data-manager.py --action=stats --days=${days} --limit=${limit}`
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 30000,
        env: { ...process.env }
      })

      if (stderr) {
        console.error('数据管理器错误:', stderr)
      }

      // 解析输出结果
      const stats = parseDataManagerOutput(stdout)

      return NextResponse.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      })

    } catch (error: any) {
      console.error('获取测试数据失败:', error)
      
      // 返回默认数据
      return NextResponse.json({
        success: false,
        message: '获取测试数据失败',
        data: getDefaultStats(),
        error: error.message
      })
    }

  } catch (error) {
    console.error('处理测试数据请求失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '处理测试数据请求失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// POST - 保存测试数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    console.log(`💾 保存测试数据: type=${type}`)

    // 根据类型保存不同的测试数据
    let result
    switch (type) {
      case 'connection':
        result = await saveConnectionTestData(data)
        break
      case 'crawler':
        result = await saveCrawlerTestData(data)
        break
      case 'suite':
        result = await saveTestSuiteData(data)
        break
      default:
        result = await saveGenericTestData(type, data)
        break
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${type} 测试数据保存成功`,
        data: result.data
      })
    } else {
      return NextResponse.json({
        success: false,
        message: `${type} 测试数据保存失败`,
        error: result.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error('保存测试数据失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '保存测试数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// DELETE - 清理旧的测试数据
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    console.log(`🗑️ 清理 ${days} 天前的测试数据`)

    const command = `python tests/scripts/test-data-manager.py --action=cleanup --days=${days}`
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 30000,
        env: { ...process.env }
      })

      if (stderr) {
        console.error('数据清理错误:', stderr)
      }

      return NextResponse.json({
        success: true,
        message: `成功清理 ${days} 天前的测试数据`,
        output: stdout
      })

    } catch (error: any) {
      console.error('清理测试数据失败:', error)
      
      return NextResponse.json({
        success: false,
        message: '清理测试数据失败',
        error: error.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('处理数据清理请求失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '处理数据清理请求失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

function parseDataManagerOutput(output: string) {
  // 解析Python数据管理器的输出
  const stats = {
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      successRate: 0
    },
    byType: {},
    recent: []
  }

  try {
    // 简化的解析逻辑，实际应该根据具体输出格式调整
    const lines = output.split('\n')
    
    for (const line of lines) {
      // 解析总计信息
      if (line.includes('总计:')) {
        const match = line.match(/总计:\s*(\d+)/)
        if (match && match[1]) {
          stats.summary.totalTests += parseInt(match[1])
        }
      }
      
      // 解析通过信息
      if (line.includes('通过:')) {
        const match = line.match(/通过:\s*(\d+)/)
        if (match && match[1]) {
          stats.summary.passedTests += parseInt(match[1])
        }
      }
      
      // 解析失败信息
      if (line.includes('失败:')) {
        const match = line.match(/失败:\s*(\d+)/)
        if (match && match[1]) {
          stats.summary.failedTests += parseInt(match[1])
        }
      }
    }

    // 计算成功率
    if (stats.summary.totalTests > 0) {
      stats.summary.successRate = (stats.summary.passedTests / stats.summary.totalTests) * 100
    }

  } catch (error) {
    console.error('解析数据管理器输出失败:', error)
  }

  return stats
}

async function saveConnectionTestData(data: any) {
  try {
    const command = `python -c "
import sys
sys.path.append('.')
from tests.scripts.test_data_manager import TestDataManager
manager = TestDataManager()
manager.save_connection_test(${JSON.stringify(data).replace(/"/g, '\\"')})
"`

    await execAsync(command, {
      cwd: process.cwd(),
      timeout: 10000,
      env: { ...process.env }
    })

    return { success: true, data: data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function saveCrawlerTestData(data: any) {
  try {
    const { config, result } = data
    
    const command = `python -c "
import sys
sys.path.append('.')
from tests.scripts.test_data_manager import TestDataManager
manager = TestDataManager()
manager.save_crawler_test(${JSON.stringify(config).replace(/"/g, '\\"')}, ${JSON.stringify(result).replace(/"/g, '\\"')})
"`

    await execAsync(command, {
      cwd: process.cwd(),
      timeout: 10000,
      env: { ...process.env }
    })

    return { success: true, data: data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function saveTestSuiteData(data: any) {
  try {
    const { suiteName, suiteData } = data
    
    const command = `python -c "
import sys
sys.path.append('.')
from tests.scripts.test_data_manager import TestDataManager
manager = TestDataManager()
manager.save_test_suite('${suiteName}', ${JSON.stringify(suiteData).replace(/"/g, '\\"')})
"`

    await execAsync(command, {
      cwd: process.cwd(),
      timeout: 10000,
      env: { ...process.env }
    })

    return { success: true, data: data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function saveGenericTestData(type: string, data: any) {
  try {
    // 保存到JSON文件作为备选方案
    const resultsDir = path.join(process.cwd(), 'tests', 'results')
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${type}-data-${timestamp}.json`
    const filepath = path.join(resultsDir, filename)

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2))

    return { success: true, data: { filepath, timestamp } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

function getDefaultStats() {
  return {
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      successRate: 0
    },
    byType: {
      connection: { total: 0, passed: 0, failed: 0, success_rate: 0 },
      crawler: { total: 0, passed: 0, failed: 0, success_rate: 0 },
      api: { total: 0, passed: 0, failed: 0, success_rate: 0 },
      frontend: { total: 0, passed: 0, failed: 0, success_rate: 0 },
      backend: { total: 0, passed: 0, failed: 0, success_rate: 0 },
      integration: { total: 0, passed: 0, failed: 0, success_rate: 0 }
    },
    recent: []
  }
}
