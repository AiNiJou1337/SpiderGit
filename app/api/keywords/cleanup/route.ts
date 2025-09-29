import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  
  try {
    const { searchParams } = new URL(request.url)
    const shouldCleanup = searchParams.get('cleanup') === 'true'
    const targetKeyword = searchParams.get('keyword') // 新增：指定要清理的关键词
    
    console.log('开始数据清理...')
    if (targetKeyword) {
      console.log(`目标清理关键词: ${targetKeyword}`)
    }
    
    // 1. 获取所有关键词
    const allKeywords = await prisma.keyword.findMany()
    console.log(`找到 ${allKeywords.length} 个关键词`)
    
    // 2. 获取所有分析文件
    const analyticsDir = path.join(process.cwd(), 'public', 'analytics')
    let analysisFiles: string[] = []
    
    try {
      if (fs.existsSync(analyticsDir)) {
        analysisFiles = fs.readdirSync(analyticsDir)
          .filter(f => f.startsWith('analysis_') && f.endsWith('.json'))
        console.log(`找到 ${analysisFiles.length} 个分析文件`)
      }
    } catch (error) {
      console.warn('读取分析文件目录失败:', error)
    }
    
    // 3. 检查 all_keywords_analysis.json 文件
    const allKeywordsFile = path.join(process.cwd(), 'public', 'result', 'all_keywords_analysis.json')
    let allKeywordsData: any[] = []
    
    try {
      if (fs.existsSync(allKeywordsFile)) {
        const fileContent = fs.readFileSync(allKeywordsFile, 'utf8')
        allKeywordsData = JSON.parse(fileContent)
        console.log(`all_keywords_analysis.json 包含 ${allKeywordsData.length} 个关键词数据`)
      }
    } catch (error) {
      console.warn('读取 all_keywords_analysis.json 失败:', error)
    }
    
    // 4. 检查数据一致性
    const inconsistencies: any[] = []
    
    // 检查孤立的分析文件（没有对应关键词记录）
    for (const file of analysisFiles) {
      const keywordName = file.replace('analysis_', '').replace('.json', '').replace(/_/g, ' ')
      const keywordExists = allKeywords.some((kw: any) => kw.text === keywordName)
      
      if (!keywordExists) {
        inconsistencies.push({
          type: 'orphan_file',
          file: file,
          keyword: keywordName,
          action: 'delete_file'
        })
      }
    }
    
    // 检查孤立的关键词记录（没有对应分析文件）
    for (const keyword of allKeywords) {
      const expectedFile = `analysis_${(keyword as any).text.replace(/ /g, '_')}.json`
      const fileExists = analysisFiles.includes(expectedFile)
      
      if (!fileExists) {
        // 检查是否有相关的数据库记录
        const hasAnalytics = await prisma.analytics.count({
          where: { keywordId: (keyword as any).id }
        })
        
        const hasRepoKeywords = await prisma.repositoryKeyword.count({
          where: { keywordId: (keyword as any).id }
        })
        
        const hasCrawlTasks = await prisma.crawlTask.count({
          where: { keywordId: (keyword as any).id }
        })
        
        if (hasAnalytics === 0 && hasRepoKeywords === 0 && hasCrawlTasks === 0) {
          inconsistencies.push({
            type: 'orphan_keyword',
            keyword: (keyword as any).text,
            keywordId: (keyword as any).id,
            action: 'delete_keyword'
          })
        }
      }
    }
    
    // 检查 all_keywords_analysis.json 中的孤立数据
    for (const item of allKeywordsData) {
      if (item.keyword) {
        const keywordExists = allKeywords.some((kw: any) => kw.text === item.keyword)
        if (!keywordExists) {
          inconsistencies.push({
            type: 'orphan_all_keywords_data',
            keyword: item.keyword,
            action: 'remove_from_all_keywords'
          })
        }
      }
    }
    
    console.log(`发现 ${inconsistencies.length} 个不一致项`)
    
    // 5. 执行清理（如果请求包含 cleanup=true）
    if (shouldCleanup) {
      console.log('开始执行清理...')
      
      // 清理孤立的分析文件
      for (const item of inconsistencies) {
        if (item.type === 'orphan_file') {
          try {
            const filePath = path.join(analyticsDir, item.file)
            fs.unlinkSync(filePath)
            console.log(`删除了孤立文件: ${item.file}`)
          } catch (error) {
            console.warn(`删除文件失败 ${item.file}:`, error)
          }
        }
      }
      
      // 清理孤立的数据库记录
      for (const item of inconsistencies) {
        if (item.type === 'orphan_keyword') {
          try {
            await prisma.keyword.delete({
              where: { id: item.keywordId }
            })
            console.log(`删除了孤立关键词: ${item.keyword}`)
          } catch (error) {
            console.warn(`删除关键词失败 ${item.keyword}:`, error)
          }
        }
      }
      
      // 清理 all_keywords_analysis.json 中的孤立数据
      const orphanKeywords = inconsistencies
        .filter(item => item.type === 'orphan_all_keywords_data')
        .map(item => item.keyword)
      
      if (orphanKeywords.length > 0) {
        try {
          const cleanedData = allKeywordsData.filter(item => 
            !orphanKeywords.includes(item.keyword)
          )
          
          fs.writeFileSync(allKeywordsFile, JSON.stringify(cleanedData, null, 2))
          console.log(`从 all_keywords_analysis.json 中清理了 ${orphanKeywords.length} 个孤立关键词`)
        } catch (error) {
          console.warn('清理 all_keywords_analysis.json 失败:', error)
        }
      }
      
      // 如果指定了目标关键词，进行专门清理
      if (targetKeyword) {
        console.log(`开始专门清理关键词: ${targetKeyword}`)
        
        // 清理数据库中的相关记录
        const targetKeywordRecord = await prisma.keyword.findFirst({
          where: { text: targetKeyword }
        })
        
        if (targetKeywordRecord) {
          // 删除分析数据
          const analyticsResult = await prisma.analytics.deleteMany({
            where: { keywordId: targetKeywordRecord.id }
          })
          console.log(`删除了 ${analyticsResult.count} 条分析数据`)
          
          // 删除仓库关键词关联
          const repoKeywordResult = await prisma.repositoryKeyword.deleteMany({
            where: { keywordId: targetKeywordRecord.id }
          })
          console.log(`删除了 ${repoKeywordResult.count} 条仓库关键词关联`)
          
          // 删除爬虫任务
          const crawlTaskResult = await prisma.crawlTask.deleteMany({
            where: { keywordId: targetKeywordRecord.id }
          })
          console.log(`删除了 ${crawlTaskResult.count} 条爬虫任务`)
          
          // 删除关键词本身
          await prisma.keyword.delete({
            where: { id: targetKeywordRecord.id }
          })
          console.log(`删除了关键词: ${targetKeywordRecord.text}`)
        }
        
        // 清理分析文件
        const analysisFile = `analysis_${targetKeyword.replace(/ /g, '_')}.json`
        const analysisFilePath = path.join(analyticsDir, analysisFile)
        if (fs.existsSync(analysisFilePath)) {
          fs.unlinkSync(analysisFilePath)
          console.log(`删除了分析文件: ${analysisFile}`)
        }
        
        // 从 all_keywords_analysis.json 中移除
        const cleanedAllKeywordsData = allKeywordsData.filter(item => 
          item.keyword !== targetKeyword
        )
        
        if (cleanedAllKeywordsData.length !== allKeywordsData.length) {
          fs.writeFileSync(allKeywordsFile, JSON.stringify(cleanedAllKeywordsData, null, 2))
          console.log(`从 all_keywords_analysis.json 中移除了关键词: ${targetKeyword}`)
        }
      }
      
      console.log('清理完成')
    }
    
    return NextResponse.json({
      success: true,
      message: '数据清理完成',
      inconsistencies,
      cleaned: shouldCleanup
    })
    
  } catch (error) {
    console.error('数据清理失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '数据清理失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
