import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 收到趋势数据刷新请求')
    
    // 获取请求参数
    const body = await request.json().catch(() => ({}))
    const period = body.period || 'all' // 可以指定刷新特定时间段
    
    // Python脚本路径
    const pythonPath = process.env.PYTHON_BIN || 'python'
    const scriptPath = path.join(process.cwd(), 'backend', 'scraper', 'trending_manager.py')
    
    // 设置环境变量
    const childEnv = {
      ...process.env,
      GITHUB_TOKEN_PQG: process.env.GITHUB_TOKEN_PQG || '',
      GITHUB_TOKEN_LR: process.env.GITHUB_TOKEN_LR || '',
      GITHUB_TOKEN_HXZ: process.env.GITHUB_TOKEN_HXZ || '',
      GITHUB_TOKEN_XHY: process.env.GITHUB_TOKEN_XHY || '',
    }
    
    // 检查是否有可用的GitHub Token
    const hasToken = Object.values(childEnv).some(token => 
      token && token.startsWith('ghp_') || token.startsWith('github_pat_')
    )
    
    if (!hasToken) {
      return NextResponse.json({
        success: false,
        message: '未配置GitHub Token，无法获取数据',
        error: 'NO_GITHUB_TOKEN'
      }, { status: 400 })
    }
    
    // 异步执行爬虫脚本
    const promise = new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      exec(`${pythonPath} "${scriptPath}"`, { 
        env: childEnv,
        timeout: 600000, // 10分钟超时
        maxBuffer: 1024 * 1024 * 10 // 增加缓冲区到10MB
      }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime
        
        if (error) {
          console.error(`趋势数据刷新失败: ${error.message}`)
          console.error(`stderr: ${stderr}`)
          reject({
            success: false,
            message: '趋势数据刷新失败',
            error: error.message,
            duration: duration
          })
        } else {
          console.log('✅ 趋势数据刷新完成')
          console.log(`stdout: ${stdout}`)
          resolve({
            success: true,
            message: '趋势数据刷新完成',
            duration: duration,
            output: stdout
          })
        }
      })
    })
    
    // 立即返回响应，不等待脚本完成
    // 在生产环境中，这样可以避免请求超时
    setTimeout(async () => {
      try {
        const result = await promise
        console.log('趋势数据刷新结果:', result)
      } catch (error) {
        console.error('趋势数据刷新错误:', error)
      }
    }, 0)
    
    return NextResponse.json({
      success: true,
      message: '趋势数据刷新已启动，请稍后查看结果',
      status: 'started',
      estimatedTime: '5-10分钟',
      note: '正在爬取daily/weekly/monthly三个时间段的数据，请耐心等待'
    })
    
  } catch (error) {
    console.error('启动趋势数据刷新失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '启动趋势数据刷新失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

export async function GET() {
  // GET请求返回刷新状态信息
  try {
    const fs = require('fs')
    const path = require('path')
    
    const trendsPath = path.join(process.cwd(), 'public', 'analytics', 'trends.json')
    
    if (fs.existsSync(trendsPath)) {
      const stats = fs.statSync(trendsPath)
      const data = JSON.parse(fs.readFileSync(trendsPath, 'utf8'))
      
      return NextResponse.json({
        exists: true,
        lastModified: stats.mtime.toISOString(),
        lastUpdated: data.lastUpdated || null,
        metadata: data.metadata || {},
        fileSize: stats.size
      })
    } else {
      return NextResponse.json({
        exists: false,
        message: '趋势数据文件不存在，需要首次生成'
      })
    }
  } catch (error) {
    return NextResponse.json({
      exists: false,
      error: error instanceof Error ? error.message : '检查文件状态失败'
    }, { status: 500 })
  }
}
