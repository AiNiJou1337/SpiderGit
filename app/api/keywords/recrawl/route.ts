import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { exec } from 'child_process';
import path from 'path';

// 重新爬取关键词的API
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      keyword, 
      languages, 
      limits 
    } = data;
    
    if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
      return NextResponse.json(
        { error: '关键词不能为空' },
        { status: 400 }
      );
    }
    
    // 检查关键词是否存在
    const keywordRecord = await prisma.keyword.findUnique({
      where: {
        text: keyword
      },
      include: {
        crawlTasks: {
          where: {
            OR: [
              { status: 'pending' },
              { status: 'running' }
            ]
          },
          orderBy: {
            startedAt: 'desc'
          },
          take: 1
        }
      }
    });
    
    // 如果关键词不存在
    if (!keywordRecord) {
      return NextResponse.json(
        { error: '未找到该关键词' },
        { status: 404 }
      );
    }
    
    // 如果有正在进行的任务
    if (keywordRecord.crawlTasks.length > 0) {
      const runningTask = keywordRecord.crawlTasks[0];
      return NextResponse.json({
        success: true,
        message: '该关键词正在处理中，可以查看任务进度',
        taskId: runningTask.id
      });
    }
    
    // 创建新的爬虫任务记录
    const crawlTask = await prisma.crawlTask.create({
      data: {
        status: 'pending',
        progress: 0,
        message: '重新爬取任务已创建，正在启动...',
        keywordId: keywordRecord.id,
      }
    });
    
    // 准备爬虫命令参数
    let cmd = `D:\\IT_software\\miniconda\\python.exe "${path.join(process.cwd(), 'scraper', 'keyword_scraper.py')}" --keywords "${keyword}" --task-id ${crawlTask.id}`;
    
    // 添加语言参数
    if (languages && Array.isArray(languages) && languages.length > 0) {
      cmd += ` --languages "${languages.join(',')}"`;
    }
    
    // 添加数量限制参数
    if (limits && typeof limits === 'object') {
      const limitsStr = Object.entries(limits)
        .map(([lang, limit]) => `${lang}=${limit}`)
        .join(',');
      
      if (limitsStr) {
        cmd += ` --limits "${limitsStr}"`;
      }
    }
    
    console.log(`执行重新爬取命令: ${cmd}`);
    
    // 运行爬虫脚本 (异步执行，不等待完成)
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`爬虫执行错误: ${error.message}`);
        // 更新任务状态为失败
        updateTaskStatus(crawlTask.id, 'failed', 0, `执行错误: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`爬虫错误输出: ${stderr}`);
      }
      console.log(`爬虫输出: ${stdout}`);
      
      // 爬虫完成后运行数据分析
      const analysisPath = path.join(process.cwd(), 'scraper', 'data_analysis.py');
      exec(`D:\\IT_software\\miniconda\\python.exe "${analysisPath}" --keywords "${keyword}" --task-id ${crawlTask.id}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`数据分析执行错误: ${error.message}`);
          // 更新任务状态
          updateTaskStatus(crawlTask.id, 'failed', 80, `分析错误: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`数据分析错误输出: ${stderr}`);
        }
        console.log(`数据分析输出: ${stdout}`);
        
        // 完成后更新任务状态
        updateTaskStatus(crawlTask.id, 'completed', 100, '重新爬取和分析已完成');
      });
    });
    
    return NextResponse.json({
      success: true,
      message: '重新爬取请求已提交，这可能需要一些时间',
      taskId: crawlTask.id
    });
  } catch (error) {
    console.error('提交重新爬取请求失败:', error);
    return NextResponse.json(
      { error: '提交重新爬取请求失败' },
      { status: 500 }
    );
  }
}

// 更新任务状态的辅助函数
async function updateTaskStatus(taskId: number, status: string, progress: number, message?: string) {
  try {
    await prisma.crawlTask.update({
      where: { id: taskId },
      data: {
        status,
        progress,
        message,
        ...(status === 'completed' || status === 'failed' ? { completedAt: new Date() } : {})
      }
    });
  } catch (error) {
    console.error(`更新任务状态失败 (ID: ${taskId}):`, error);
  }
} 