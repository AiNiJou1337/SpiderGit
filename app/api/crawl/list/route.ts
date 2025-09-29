import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// 获取爬虫任务列表数据
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 20;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1;
    const status = searchParams.get('status'); // 可选过滤状态
    
    // 构建查询条件
    const where: any = {};
    if (status) {
      // 支持多个状态，用逗号分隔
      const statusList = status.split(',');
      if (statusList.length > 1) {
        where.status = { in: statusList };
      } else {
        where.status = status;
      }
    }
    
    // 获取爬虫任务
    const tasks = await prisma.crawlTask.findMany({
      where,
      orderBy: {
        started_at: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        keyword: true
      }
    });
    
    // 获取总数
    const total = await prisma.crawlTask.count({ where });
    
    // 格式化任务数据
    const formattedTasks = tasks.map((task: any) => ({
      id: task.id,
      keyword: task.keyword.text,
      status: task.status,
      progress: task.progress,
      message: task.message,
      startedAt: task.started_at,
      completedAt: task.completed_at,
      totalRepositories: task.total_repositories,
      pythonRepositories: task.python_repositories,
      javaRepositories: task.java_repositories
    }));
    
    return NextResponse.json({
      tasks: formattedTasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取爬虫任务列表失败:', error);
    return NextResponse.json(
      { error: '获取爬虫任务列表失败' },
      { status: 500 }
    );
  }
} 