import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  // 1. 分析目录
  const analyticsDir = path.join(process.cwd(), 'public', 'analytics')
  // 2. 读取所有 analysis_*.json 文件
  const files = fs.readdirSync(analyticsDir)
  const analysisFiles = files.filter(f =>
    f.startsWith('analysis_') &&
    f.endsWith('.json') &&
    !f.includes('test') &&
    !f.includes('data')
  )
  // 3. 生成主题名和文件路径
  const result = analysisFiles.map(f => {
    // 主题名：去掉 analysis_ 和 .json，将下划线转换为空格以匹配数据库关键词
    let name = f.replace('analysis_', '').replace('.json', '').replace(/_/g, ' ')
    // 转换为空格格式，确保与数据库关键词名称一致
    return {
      name,
      file: `/analytics/${f}`
    }
  })
  // 4. 按名称排序
  result.sort((a, b) => a.name.localeCompare(b.name))
  return NextResponse.json(result)
} 