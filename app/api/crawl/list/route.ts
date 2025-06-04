import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 获取爬虫任务列表数据
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 20;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1;
    const status = searchParams.get('status'); // 可选过滤状态
    
    // 构建查询条件
    const where = status ? {
      status: status
    } : {};
    
    // 获取爬虫任务
    const tasks = await prisma.crawlTask.findMany({
      where,
      orderBy: {
        startedAt: 'desc'
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
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      keyword: task.keyword.text,
      status: task.status,
      progress: task.progress,
      message: task.message,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      totalRepositories: task.totalRepositories,
      pythonRepositories: task.pythonRepositories,
      javaRepositories: task.javaRepositories
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