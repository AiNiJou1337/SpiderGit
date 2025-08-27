import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { periods, immediate = false } = body

    console.log('🚀 触发时间序列趋势数据收集...', { periods, immediate })

    // 验证periods参数
    const validPeriods = ['daily', 'weekly', 'monthly']
    const targetPeriods = periods ? 
      periods.filter((p: string) => validPeriods.includes(p)) : 
      validPeriods

    if (targetPeriods.length === 0) {
      return NextResponse.json({
        success: false,
        message: '无效的时间段参数'
      }, { status: 400 })
    }

    // 检查Python脚本是否存在
    const pythonPath = process.env.PYTHON_BIN || 'python'
    const timeSeriesScriptPath = path.join(process.cwd(), 'backend', 'scraper', 'time_series_trending_manager.py')

    if (!fs.existsSync(timeSeriesScriptPath)) {
      return NextResponse.json({
        success: false,
        message: '时间序列数据管理器脚本不存在'
      }, { status: 500 })
    }

    const childEnv = {
      ...process.env,
      GITHUB_TOKEN_PQG: process.env.GITHUB_TOKEN_PQG || '',
      GITHUB_TOKEN_LR: process.env.GITHUB_TOKEN_LR || '',
      GITHUB_TOKEN_HXZ: process.env.GITHUB_TOKEN_HXZ || '',
      GITHUB_TOKEN_XHY: process.env.GITHUB_TOKEN_XHY || '',
    }

    if (immediate) {
      // 立即执行数据收集
      try {
        const command = `${pythonPath} "${timeSeriesScriptPath}"`

        console.log('执行命令:', command)

        const { stdout, stderr } = await execAsync(command, { 
          env: childEnv,
          timeout: 300000 // 5分钟超时
        })

        console.log('Python脚本输出:', stdout)
        if (stderr) {
          console.warn('Python脚本警告:', stderr)
        }

        return NextResponse.json({
          success: true,
          message: '时间序列数据收集完成',
          periods: targetPeriods,
          output: stdout,
          timestamp: new Date().toISOString()
        })

      } catch (error: any) {
        console.error('执行数据收集失败:', error)
        
        return NextResponse.json({
          success: false,
          message: '数据收集执行失败',
          error: error.message,
          periods: targetPeriods
        }, { status: 500 })
      }

    } else {
      // 异步执行，不等待完成
      const command = `${pythonPath} "${timeSeriesScriptPath}"`

      exec(command, { env: childEnv }, (error, stdout, stderr) => {
        if (error) {
          console.error(`异步数据收集错误: ${error.message}`)
        } else {
          console.log('✅ 异步时间序列数据收集完成')
          if (stdout) console.log('输出:', stdout)
        }
        if (stderr) {
          console.warn('警告:', stderr)
        }
      })

      return NextResponse.json({
        success: true,
        message: '时间序列数据收集已启动（异步执行）',
        periods: targetPeriods,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('处理数据收集请求失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '处理数据收集请求失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // 获取收集状态
    const reportFile = path.join(process.cwd(), 'public', 'analytics', 'time_series', 'collection_report.json')

    let report = null

    if (fs.existsSync(reportFile)) {
      try {
        report = JSON.parse(fs.readFileSync(reportFile, 'utf8'))
      } catch (error) {
        console.warn('读取报告文件失败:', error)
      }
    }

    // 统计时间序列数据文件
    const timeSeriesDir = path.join(process.cwd(), 'public', 'analytics', 'time_series')
    const statistics = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      total: 0
    }

    if (fs.existsSync(timeSeriesDir)) {
      for (const period of ['daily', 'weekly', 'monthly']) {
        const periodDir = path.join(timeSeriesDir, period)
        if (fs.existsSync(periodDir)) {
          const files = fs.readdirSync(periodDir).filter(f => f.endsWith('.json'))
          statistics[period as keyof typeof statistics] = files.length
          statistics.total += files.length
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '获取收集状态成功',
      data: {
        report,
        statistics,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('获取收集状态失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '获取收集状态失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
