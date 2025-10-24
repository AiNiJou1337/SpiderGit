import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

async function resolvePythonBin(requiredMajor = 3, requiredMinor = 12): Promise<string> {
  // 1) 如果设置了 PYTHON_BIN，优先使用并校验版本
  const envBin = process.env.PYTHON_BIN;
  const candidates: string[] = [];
  if (envBin && envBin.trim()) candidates.push(envBin.trim());

  // 2) 按平台提供候选项
  if (process.platform === 'win32') {
    // Windows 优先使用 py 启动器
    candidates.push('py -3.12');
    candidates.push('python3.12');
    candidates.push('python');
  } else {
    candidates.push('python3.12');
    candidates.push('python3');
    candidates.push('python');
  }

  // 3) 逐个尝试，并检查版本
  for (const bin of candidates) {
    try {
      const { stdout } = await execAsync(`${bin} -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"`);
      const ver = (stdout || '').trim();
      const parts = ver.split('.');
      if (parts.length >= 2) {
        const maj = parseInt(parts[0] || '0', 10);
        const min = parseInt(parts[1] || '0', 10);
        if (!isNaN(maj) && !isNaN(min)) {
          if (maj > requiredMajor || (maj === requiredMajor && min >= requiredMinor)) {
            return bin;
          }
        }
      }
    } catch (_) {
      // 忽略尝试失败，继续下一个候选
    }
  }

  throw new Error(
    `未找到可用的 Python ${requiredMajor}.${requiredMinor}+ 解释器。` +
    ` 请在 .env 中设置 PYTHON_BIN（例如 Windows: py -3.12 或 python3.12；Linux/macOS: python3.12）`
  );
}

// 重新爬取关键词的API
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      keyword, 
      languages, 
      limits,
      codeAnalysisLimit
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
        crawl_tasks: {
          where: {
            OR: [
              { status: 'pending' },
              { status: 'running' }
            ]
          },
          orderBy: {
            started_at: 'desc'
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
    if (keywordRecord.crawl_tasks.length > 0) {
      const runningTask = keywordRecord.crawl_tasks[0];
      if (runningTask) {
        return NextResponse.json({
          success: true,
          message: '该关键词正在处理中，可以查看任务进度',
          taskId: runningTask.id
        });
      }
    }
    
    // 创建新的爬虫任务记录
    const crawlTask = await prisma.crawlTask.create({
      data: {
        status: 'pending',
        progress: 0,
        message: '重新爬取任务已创建，正在启动...',
        keywordId: keywordRecord.id,
        started_at: new Date(),
      }
    });
    
    // 解析并校验 Python 解释器 (>=3.12)
    let PYTHON_BIN: string;
    try {
      PYTHON_BIN = await resolvePythonBin(3, 12);
    } catch (e: any) {
      console.error('Python 解析/校验失败:', e?.message || e);
      await updateTaskStatus(crawlTask.id, 'failed', 0, `Python 不可用: ${e?.message || e}`);
      return NextResponse.json(
        { error: 'Python 解释器不可用（需 3.12+），请检查 PYTHON_BIN 或安装 Python 3.12+' },
        { status: 500 }
      );
    }

    // 准备爬虫命令参数
    let cmd = `${PYTHON_BIN} "${path.join(process.cwd(), 'backend', 'scraper', 'crawlers', 'keyword_scraper.py')}" --keywords "${keyword}" --task-id ${crawlTask.id}`;

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

    // 运行爬虫脚本 (异步执行，不等待完成) —— 显式传递必要环境变量
    const childEnv = {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || '',
      GITHUB_TOKEN_PQG: process.env.GITHUB_TOKEN_PQG || '',
      GITHUB_TOKEN_LR: process.env.GITHUB_TOKEN_LR || '',
      GITHUB_TOKEN_HXZ: process.env.GITHUB_TOKEN_HXZ || '',
      CODE_ANALYSIS_LIMIT: codeAnalysisLimit !== undefined ? String(codeAnalysisLimit) : '100',
    };

    exec(cmd, { env: childEnv }, (error, stdout, stderr) => {
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
      const analysisPath = path.join(process.cwd(), 'backend', 'scraper', 'analyzers', 'data_analysis.py');
      exec(`${PYTHON_BIN} "${analysisPath}" --keywords "${keyword}" --task-id ${crawlTask.id}`, { env: childEnv }, (error, stdout, stderr) => {
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
    const updateData: any = {
      status,
      progress,
      ...(status === 'completed' || status === 'failed' ? { completed_at: new Date() } : {})
    };
    
    // 只有当message有值时才添加到更新数据中
    if (message !== undefined) {
      updateData.message = message;
    }
    
    await prisma.crawlTask.update({
      where: { id: taskId },
      data: updateData
    });
  } catch (error) {
    console.error(`更新任务状态失败 (ID: ${taskId}):`, error);
  }
} 