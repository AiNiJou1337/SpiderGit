import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 获取爬虫任务统计数据
export async function GET() {
  try {
    // 获取已完成的爬虫任务数量
    const completedTasksCount = await prisma.crawlTask.count({
      where: {
        status: 'completed'
      }
    });
    
    // 获取待处理的爬虫任务数量（包括pending和running状态）
    const pendingTasksCount = await prisma.crawlTask.count({
      where: {
        status: {
          in: ['pending', 'running']
        }
      }
    });
    
    // 获取失败的爬虫任务数量
    const failedTasksCount = await prisma.crawlTask.count({
      where: {
        status: 'failed'
      }
    });
    
    // 获取最近的爬虫任务
    const recentTasks = await prisma.crawlTask.findMany({
      take: 5,
      orderBy: {
        startedAt: 'desc'
      },
      include: {
        keyword: true
      }
    });
    
    // 格式化最近任务数据
    const formattedRecentTasks = recentTasks.map(task => ({
      id: task.id,
      keyword: task.keyword.text,
      status: task.status,
      progress: task.progress,
      startedAt: task.startedAt,
      completedAt: task.completedAt
    }));
    
    return NextResponse.json({
      completedTasks: completedTasksCount,
      pendingTasks: pendingTasksCount,
      failedTasks: failedTasksCount,
      recentTasks: formattedRecentTasks
    });
  } catch (error) {
    console.error('获取爬虫任务统计数据失败:', error);
    return NextResponse.json(
      { error: '获取爬虫任务统计数据失败' },
      { status: 500 }
    );
  }
} 