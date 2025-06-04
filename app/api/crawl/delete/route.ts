import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 删除爬虫任务
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');
    
    if (!taskId) {
      return NextResponse.json(
        { error: '任务ID不能为空' },
        { status: 400 }
      );
    }
    
    // 查找任务是否存在
    const task = await prisma.crawlTask.findUnique({
      where: {
        id: parseInt(taskId)
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      );
    }
    
    // 删除任务记录
    await prisma.crawlTask.delete({
      where: {
        id: parseInt(taskId)
      }
    });
    
    return NextResponse.json({
      success: true,
      message: '任务记录已删除'
    });
  } catch (error) {
    console.error('删除爬虫任务失败:', error);
    return NextResponse.json(
      { error: '删除爬虫任务失败' },
      { status: 500 }
    );
  }
} 