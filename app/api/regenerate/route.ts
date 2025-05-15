import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

// 运行分析脚本的函数
async function runAnalysisScript(keyword: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scraper', 'data_analysis.py');
    const command = `python "${scriptPath}" --keywords "${keyword}"`;
    
    console.log(`执行命令: ${command}`);
    
    exec(command, { env: { ...process.env, PYTHONPATH: process.cwd() } }, (error, stdout, stderr) => {
      if (error) {
        console.error(`执行分析脚本出错: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        resolve({ success: false, message: error.message });
        return;
      }
      
      if (stderr) {
        console.warn(`分析脚本警告: ${stderr}`);
      }
      
      console.log(`分析脚本输出: ${stdout}`);
      resolve({ success: true, message: '分析完成' });
    });
  });
}

// 检查分析数据文件是否存在
async function checkAnalysisFile(keyword: string): Promise<{ success: boolean; message: string }> {
  const safeKeyword = keyword.replace(/ /g, '_').replace(/\//g, '_').replace(/\\/g, '_');
  const analyticsDir = path.join(process.cwd(), 'public', 'analytics');
  const analysisFile = path.join(analyticsDir, `analysis_${safeKeyword}.json`);
  
  try {
    await fs.access(analysisFile);
    return { success: true, message: '数据文件存在' };
  } catch (error) {
    return { success: false, message: '数据文件不存在' };
  }
}

// API端点处理函数
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
    
    // 运行分析脚本
    const result = await runAnalysisScript(keyword);
    
    if (!result.success) {
      return NextResponse.json(
        { error: `分析脚本执行失败: ${result.message}` },
        { status: 500 }
      );
    }
    
    // 检查分析数据文件
    const fileCheck = await checkAnalysisFile(keyword);
    
    if (!fileCheck.success) {
      return NextResponse.json({
        success: false,
        message: '分析脚本执行成功，但未生成数据文件',
        fileStatus: fileCheck
      });
    }
    
    return NextResponse.json({
      success: true,
      message: '分析完成',
      fileStatus: fileCheck
    });
    
  } catch (error) {
    console.error('重新生成分析数据失败:', error);
    return NextResponse.json(
      { error: '重新生成分析数据失败' },
      { status: 500 }
    );
  }
} 