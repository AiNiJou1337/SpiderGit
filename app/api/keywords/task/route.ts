import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 获取特定关键词的爬虫任务状态
export async function GET(request: Request) {
  try {
    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    
    if (!keyword) {
      return NextResponse.json(
        { error: '关键词参数不能为空' },
        { status: 400 }
      );
    }
    
    // 查找关键词
    const keywordRecord = await prisma.keyword.findUnique({
      where: {
        text: keyword
      },
      include: {
        // 查询最近的爬虫任务
        crawlTasks: {
          orderBy: {
            startedAt: 'desc'
          },
          take: 1
        }
      }
    });
    
    if (!keywordRecord) {
      return NextResponse.json(
        { error: '未找到该关键词' },
        { status: 404 }
      );
    }
    
    // 如果没有爬虫任务，返回默认完成状态
    if (!keywordRecord.crawlTasks || keywordRecord.crawlTasks.length === 0) {
      const repositoryCount = await prisma.repositoryKeyword.count({
        where: {
          keywordId: keywordRecord.id
        }
      });
      
      // 如果有相关仓库，说明爬虫已经完成
      if (repositoryCount > 0) {
        return NextResponse.json({
          status: 'completed',
          progress: 100,
          message: '爬取任务已完成',
          totalRepositories: repositoryCount
        });
      }
      
      // 否则，说明爬虫尚未开始或数据不存在
      return NextResponse.json({
        status: 'pending',
        progress: 0,
        message: '爬取任务尚未开始或正在排队'
      });
    }
    
    // 返回最近的任务状态
    const task = keywordRecord.crawlTasks[0];
    
    return NextResponse.json({
      status: task.status,
      progress: task.progress,
      message: task.message || undefined,
      totalRepositories: task.totalRepositories,
      pythonRepositories: task.pythonRepositories,
      javaRepositories: task.javaRepositories,
      startedAt: task.startedAt,
      completedAt: task.completedAt || undefined
    });
  } catch (error) {
    console.error('获取爬虫任务状态失败:', error);
    return NextResponse.json(
      { error: '获取爬虫任务状态失败' },
      { status: 500 }
    );
  }
} 