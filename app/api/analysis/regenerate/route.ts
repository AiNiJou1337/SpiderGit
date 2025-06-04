import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 重新生成特定关键词的分析结果
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    const { keyword } = body;
    
    if (!keyword) {
      return NextResponse.json(
        { error: '必须提供关键词' },
        { status: 400 }
      );
    }
    
    // 清理关键词，避免命令注入
    const safeKeyword = keyword
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .trim();
    
    if (!safeKeyword) {
      return NextResponse.json(
        { error: '关键词格式无效' },
        { status: 400 }
      );
    }
    
    // 检查分析文件是否存在
    const publicDir = path.resolve('public');
    const analyticsDir = path.join(publicDir, 'analytics');
    const analysisPaths = [
      path.join(analyticsDir, `analysis_${safeKeyword}.json`),
      path.join(analyticsDir, `analysis_${keyword}.json`),
      path.join(analyticsDir, `analysis_${keyword.replace(/\s+/g, '_')}.json`)
    ];
    
    let analysisFile = null;
    for (const filePath of analysisPaths) {
      if (existsSync(filePath)) {
        analysisFile = filePath;
        break;
      }
    }
    
    if (!analysisFile) {
      return NextResponse.json(
        { error: '找不到分析文件，请先爬取数据' },
        { status: 404 }
      );
    }
    
    // 调用Python脚本重新生成分析数据
    try {
      // 使用data_analysis.py而不是regenerate_all.py，以确保完整的分析流程
      const scriptPath = path.join(process.cwd(), 'scraper', 'data_analysis.py');
      
      // 执行Python脚本，传递数据库连接信息和关键词参数
      const { stdout, stderr } = await execAsync(`D:\\IT_software\\miniconda\\python.exe "${scriptPath}" --keywords "${keyword}"`, {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/github_trending'
        }
      });
      
      if (stderr) {
        console.error('Python脚本执行错误:', stderr);
        return NextResponse.json(
          { error: '重新生成分析数据时出错' },
          { status: 500 }
        );
      }
      
      console.log('Python脚本执行输出:', stdout);
      
      return NextResponse.json({
        success: true,
        message: '分析已重新生成',
        file: path.basename(analysisFile)
      });
    } catch (error: any) {
      console.error('处理分析文件时出错:', error);
      return NextResponse.json(
        { error: `处理分析文件失败: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('重新生成分析时出错:', error);
    return NextResponse.json(
      { error: `请求处理失败: ${error.message}` },
      { status: 500 }
    );
  }
}