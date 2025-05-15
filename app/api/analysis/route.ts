import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 获取特定关键词的分析结果
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
    
    // 文件名安全处理：将空格和特殊字符替换为下划线
    const safeKeyword = keyword.replace(/ /g, '_').replace(/\//g, '_').replace(/\\/g, '_');
    
    // 分析结果文件路径
    const analyticsDir = path.join(process.cwd(), 'public', 'analytics');
    const analysisFile = path.join(analyticsDir, `analysis_${safeKeyword}.json`);
    
    try {
      // 检查文件是否存在
      try {
        await fs.access(analysisFile);
      } catch (error) {
        console.error(`分析文件不存在: ${analysisFile}`);
        
        // 如果文件不存在，尝试使用直接用关键词作为文件名（向后兼容）
        const oldStyleFile = path.join(analyticsDir, `analysis_${keyword}.json`);
        try {
          await fs.access(oldStyleFile);
          // 如果旧风格文件名存在，使用它
          const fileContent = await fs.readFile(oldStyleFile, 'utf-8');
          const analysisData = JSON.parse(fileContent);
          return NextResponse.json(analysisData);
        } catch (e) {
          // 所有尝试都失败
          return NextResponse.json(
            { error: '该关键词的分析结果尚未生成或不存在' },
            { status: 404 }
          );
        }
      }
      
      // 读取分析结果文件
      const fileContent = await fs.readFile(analysisFile, 'utf-8');
      const analysisData = JSON.parse(fileContent);
      
      return NextResponse.json(analysisData);
    } catch (error) {
      // 文件不存在或读取失败
      console.error(`无法读取分析结果文件: ${error}`);
      
      return NextResponse.json(
        { error: '该关键词的分析结果尚未生成或不存在' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('获取分析结果失败:', error);
    return NextResponse.json(
      { error: '获取分析结果失败' },
      { status: 500 }
    );
  }
} 