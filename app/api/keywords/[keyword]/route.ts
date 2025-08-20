import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyword: string } }
) {
  const prisma = new PrismaClient()

  try {
    const keyword = decodeURIComponent(params.keyword)
    console.log(`开始删除关键词: ${keyword}`)

    // 1. 先查找关键词ID
    const keywordRecord = await prisma.keyword.findFirst({
      where: { text: keyword }
    })

    if (!keywordRecord) {
      console.log(`关键词 "${keyword}" 不存在`)
      return NextResponse.json({
        success: false,
        error: '关键词不存在'
      }, { status: 404 })
    }

    console.log(`找到关键词记录，ID: ${keywordRecord.id}`)

    // 2. 分步删除相关数据（避免复杂事务）
    try {
      // 删除分析数据
      const analyticsResult = await prisma.analytics.deleteMany({
        where: { keywordId: keywordRecord.id }
      })
      console.log(`删除了 ${analyticsResult.count} 条分析数据`)

      // 删除仓库关键词关联
      const repoKeywordResult = await prisma.repositoryKeyword.deleteMany({
        where: { keywordId: keywordRecord.id }
      })
      console.log(`删除了 ${repoKeywordResult.count} 条仓库关键词关联`)

      // 删除爬虫任务
      const crawlTaskResult = await prisma.crawlTask.deleteMany({
        where: { keywordId: keywordRecord.id }
      })
      console.log(`删除了 ${crawlTaskResult.count} 条爬虫任务`)

      // 最后删除关键词本身
      const keywordResult = await prisma.keyword.delete({
        where: { id: keywordRecord.id }
      })
      console.log(`删除了关键词: ${keywordResult.text}`)

    } catch (dbError) {
      console.error('数据库删除操作失败:', dbError)
      throw dbError
    }

    // 3. 删除分析结果文件
    try {
      const analysisDir = path.join(process.cwd(), 'public', 'analytics')
      const analysisFile = path.join(analysisDir, `analysis_${keyword}.json`)

      if (fs.existsSync(analysisFile)) {
        fs.unlinkSync(analysisFile)
        console.log(`删除了分析文件: ${analysisFile}`)
      }
    } catch (fileError) {
      console.warn('删除分析文件失败:', fileError)
      // 文件删除失败不影响整体操作
    }

    console.log(`关键词 "${keyword}" 删除完成`)
    return NextResponse.json({
      success: true,
      message: `关键词 "${keyword}" 及其相关数据已删除`
    })

  } catch (error) {
    console.error('删除关键词失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '删除关键词失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
