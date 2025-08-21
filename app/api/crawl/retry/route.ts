import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { exec } from 'child_process';
import path from 'path';

// 更新任务状态的辅助函数
async function updateTaskStatus(taskId: number, status: string, progress: number, message: string) {
  try {
    await prisma.crawlTask.update({
      where: { id: taskId },
      data: {
        status,
        progress,
        message,
        ...(status === 'completed' ? { completed_at: new Date() } : {})
      }
    });
  } catch (error) {
    console.error('更新任务状态失败:', error);
  }
}

// Python 解释器解析函数
async function resolvePythonBin(minMajor: number = 3, minMinor: number = 12): Promise<string> {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  // 候选的 Python 命令
  const candidates = [
    process.env.PYTHON_BIN,
    'py -3.12',
    'python3.12',
    'python3',
    'python'
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const { stdout } = await execAsync(`${candidate} --version`);
      const versionMatch = stdout.match(/Python (\d+)\.(\d+)/);
      
      if (versionMatch) {
        const [, major, minor] = versionMatch;
        const majorNum = parseInt(major, 10);
        const minorNum = parseInt(minor, 10);
        
        if (majorNum > minMajor || (majorNum === minMajor && minorNum >= minMinor)) {
          return candidate as string;
        }
      }
    } catch (error) {
      // 继续尝试下一个候选
      continue;
    }
  }

  throw new Error(`未找到 Python ${minMajor}.${minMinor}+ 解释器`);
}

// 重试失败的爬虫任务
export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json();
    
    if (!taskId || typeof taskId !== 'number') {
      return NextResponse.json(
        { error: '任务ID无效' },
        { status: 400 }
      );
    }

    // 获取原始任务信息
    const originalTask = await prisma.crawlTask.findUnique({
      where: { id: taskId },
      include: {
        keyword: true
      }
    });

    if (!originalTask) {
      return NextResponse.json(
        { error: '未找到指定的任务' },
        { status: 404 }
      );
    }

    // 检查任务状态，只允许重试失败的任务
    if (originalTask.status !== 'failed') {
      return NextResponse.json(
        { error: '只能重试失败的任务' },
        { status: 400 }
      );
    }

    // 检查是否有正在进行的任务
    const runningTask = await prisma.crawlTask.findFirst({
      where: {
        keywordId: originalTask.keywordId,
        status: { in: ['pending', 'running'] }
      }
    });

    if (runningTask) {
      return NextResponse.json(
        { error: '该关键词已有正在进行的任务' },
        { status: 400 }
      );
    }

    // 创建新的重试任务
    const retryTask = await prisma.crawlTask.create({
      data: {
        status: 'pending',
        progress: 0,
        message: `重试任务 #${originalTask.id}，正在启动...`,
        keywordId: originalTask.keywordId,
        started_at: new Date(),
      }
    });

    // 解析并校验 Python 解释器
    let PYTHON_BIN: string;
    try {
      PYTHON_BIN = await resolvePythonBin(3, 12);
    } catch (e: any) {
      console.error('Python 解析/校验失败:', e?.message || e);
      await updateTaskStatus(retryTask.id, 'failed', 0, `Python 不可用: ${e?.message || e}`);
      return NextResponse.json(
        { error: 'Python 解释器不可用（需 3.12+），请检查 PYTHON_BIN 或安装 Python 3.12+' },
        { status: 500 }
      );
    }

    const keyword = originalTask.keyword.text;
    const scraperPath = path.join(process.cwd(), 'backend', 'scraper', 'keyword_scraper.py');
    
    // 构建爬虫命令（使用默认参数）
    let cmd = `${PYTHON_BIN} "${scraperPath}" --keywords "${keyword}" --task-id ${retryTask.id}`;
    
    // 添加默认语言参数
    cmd += ` --languages "python,java,javascript"`;
    cmd += ` --limits "python=50,java=30,javascript=30"`;

    console.log(`执行重试爬虫命令: ${cmd}`);
    
    // 标记任务为 running
    await updateTaskStatus(retryTask.id, 'running', 5, '重试爬虫进程已启动');

    // 运行爬虫脚本 (异步执行，不等待完成)
    const childEnv = {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || '',
      GITHUB_TOKEN_PQG: process.env.GITHUB_TOKEN_PQG || '',
      GITHUB_TOKEN_LR: process.env.GITHUB_TOKEN_LR || '',
      GITHUB_TOKEN_HXZ: process.env.GITHUB_TOKEN_HXZ || '',
      GITHUB_TOKEN_XHY: process.env.GITHUB_TOKEN_XHY || '',
    };

    exec(cmd, { env: childEnv }, (error, stdout, stderr) => {
      if (error) {
        console.error(`重试爬虫执行错误: ${error.message}`);
        updateTaskStatus(retryTask.id, 'failed', 50, `重试失败: ${error.message}`);
        return;
      }
      if (stderr) {
        console.warn(`重试爬虫错误输出: ${stderr}`);
      }
      console.log(`重试爬虫输出: ${stdout}`);

      // 爬虫完成后运行数据分析
      const analysisPath = path.join(process.cwd(), 'backend', 'scraper', 'analyzers', 'data_analysis.py');
      exec(`${PYTHON_BIN} "${analysisPath}" --keywords "${keyword}" --task-id ${retryTask.id}`, { env: childEnv }, (error, stdout, stderr) => {
        if (error) {
          console.error(`重试数据分析执行错误: ${error.message}`);
          updateTaskStatus(retryTask.id, 'failed', 80, `重试分析错误: ${error.message}`);
          return;
        }
        if (stderr) {
          console.warn(`重试数据分析错误输出: ${stderr}`);
        }
        console.log(`重试数据分析输出: ${stdout}`);

        // 完成后更新任务状态
        updateTaskStatus(retryTask.id, 'completed', 100, '重试爬取和分析已完成');
      });
    });

    return NextResponse.json({
      success: true,
      message: `任务 #${originalTask.id} 重试请求已提交`,
      originalTaskId: originalTask.id,
      retryTaskId: retryTask.id,
      keyword: keyword
    });

  } catch (error) {
    console.error('重试任务失败:', error);
    return NextResponse.json(
      { error: '重试任务失败，请稍后再试' },
      { status: 500 }
    );
  }
}
