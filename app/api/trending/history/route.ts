import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface HistoricalDate {
  date: string
  time: string
  filename: string
  displayDate: string
  displayTime: string
  fullTimestamp: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // 格式: YYYYMMDD 或 YYYYMMDD_HHMMSS
    const month = searchParams.get('month') // 格式: YYYYMM，用于按月查询
    
    const dataDir = path.join(process.cwd(), 'public', 'trends', 'data')
    
    // 如果没有指定日期，返回所有可用的历史数据日期
    if (!date) {
      if (!fs.existsSync(dataDir)) {
        return NextResponse.json({
          success: true,
          dates: [],
          count: 0
        })
      }
      
      const files = fs.readdirSync(dataDir)
        .filter(file => file.startsWith('trends_backup_') && file.endsWith('.json'))
      
      // 如果指定了月份，只返回该月的数据
      const filteredFiles = month 
        ? files.filter(file => file.includes(`trends_backup_${month}`))
        : files
      
      const availableDates = filteredFiles
        .map(file => {
          // 从文件名中提取日期: trends_backup_20251021_161939.json
          const match = file.match(/trends_backup_(\d{8})_(\d{6})\.json/)
          if (match) {
            const dateStr = match[1] // YYYYMMDD
            const timeStr = match[2] // HHMMSS
            
            return {
              date: dateStr,
              time: timeStr,
              filename: file,
              displayDate: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`,
              displayTime: `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`,
              fullTimestamp: `${dateStr}_${timeStr}`
            }
          }
          return null
        })
        .filter((item): item is HistoricalDate => item !== null)
        .sort((a, b) => b.fullTimestamp.localeCompare(a.fullTimestamp))
      
      return NextResponse.json({
        success: true,
        dates: availableDates,
        count: availableDates.length
      })
    }
    
    // 查找匹配的备份文件
    const files = fs.readdirSync(dataDir)
    const matchingFile = files.find(file => {
      if (date.includes('_')) {
        // 完整的时间戳格式
        return file === `trends_backup_${date}.json`
      } else {
        // 只有日期，匹配该日期的任意备份
        return file.startsWith(`trends_backup_${date}_`) && file.endsWith('.json')
      }
    })
    
    if (!matchingFile) {
      // 如果没找到备份，尝试读取当前数据
      const currentDataPath = path.join(dataDir, 'trends.json')
      if (fs.existsSync(currentDataPath)) {
        const currentData = JSON.parse(fs.readFileSync(currentDataPath, 'utf-8'))
        return NextResponse.json({
          success: true,
          data: currentData,
          metadata: {
            date: date,
            isLatest: true,
            lastUpdated: currentData.lastUpdated
          }
        })
      }
      
      return NextResponse.json({
        success: false,
        message: `未找到日期 ${date} 的数据`
      }, { status: 404 })
    }
    
    // 读取备份数据
    const filePath = path.join(dataDir, matchingFile)
    const backupData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    
    return NextResponse.json({
      success: true,
      data: backupData,
      metadata: {
        date: date,
        filename: matchingFile,
        isBackup: true
      }
    })
    
  } catch (error) {
    console.error('获取历史数据失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '获取历史数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

