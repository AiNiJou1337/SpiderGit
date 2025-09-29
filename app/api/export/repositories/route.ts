import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// 将对象数组转换为CSV字符串
function convertToCSV(arr: any[]) {
  if (arr.length === 0) return '';
  
  // 获取所有字段名
  const headers = Object.keys(arr[0]);
  
  // 创建CSV标题行
  const headerRow = headers.join(',');
  
  // 创建数据行
  const rows = arr.map(obj => {
    return headers.map(field => {
      // 处理包含逗号、引号或换行符的字段
      let value = obj[field];
      
      // 如果是日期对象，转换为字符串
      if (value instanceof Date) {
        value = value.toISOString();
      }
      
      // 如果是null或undefined，返回空字符串
      if (value === null || value === undefined) {
        return '';
      }
      
      // 转换为字符串
      const stringValue = String(value);
      
      // 如果包含逗号、引号或换行符，则需要使用引号包裹并处理内部引号
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(',');
  });
  
  // 组合所有行
  return [headerRow, ...rows].join('\n');
}

// 导出仓库数据为CSV
export async function GET(request: Request) {
  try {
    // 获取请求参数
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 1000;
    const keyword = searchParams.get('keyword');
    
    // 构建查询条件
    let where = {};
    if (keyword) {
      // 如果指定了关键词，查找与该关键词关联的仓库
      const keywordRecord = await prisma.keyword.findUnique({
        where: { text: keyword }
      });
      
      if (keywordRecord) {
        where = {
          repositoryKeywords: {
            some: {
              keywordId: keywordRecord.id
            }
          }
        };
      }
    }
    
    // 获取仓库数据
    const repositories = await prisma.repository.findMany({
      where,
      take: limit,
      orderBy: {
        stars: 'desc'
      }
    });
    
    // 格式化仓库数据
    const formattedRepos = repositories.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      owner: repo.owner,
      fullName: repo.fullName || `${repo.owner}/${repo.name}`,
      description: repo.description || '',
      language: repo.language || '',
      stars: repo.stars,
      forks: repo.forks || 0,
      url: repo.url || `https://github.com/${repo.owner}/${repo.name}`,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt
    }));
    
    // 转换为CSV
    const csv = convertToCSV(formattedRepos);
    
    // 添加BOM标记，以便Excel正确识别UTF-8编码
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csv;
    
    // 设置响应头，使浏览器将响应作为文件下载
    const headers = new Headers();
    headers.append('Content-Type', 'text/csv; charset=utf-8');
    headers.append('Content-Disposition', `attachment; filename=${keyword ? `repos_${keyword}` : 'repositories'}.csv`);
    
    return new NextResponse(csvWithBOM, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('导出仓库数据失败:', error);
    return NextResponse.json(
      { error: '导出仓库数据失败' },
      { status: 500 }
    );
  }
} 