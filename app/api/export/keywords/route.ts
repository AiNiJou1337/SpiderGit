import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

// 导出关键词数据为CSV
export async function GET(request: Request) {
  try {
    // 获取所有关键词
    const keywords = await prisma.keyword.findMany({
      orderBy: {
        text: 'asc'
      },
      include: {
        _count: {
          select: {
            repositories: true,
            crawlTasks: true
          }
        }
      }
    });
    
    // 格式化关键词数据
    const formattedKeywords = await Promise.all(keywords.map(async (keyword) => {
      // 获取最近的爬虫任务
      const latestTask = await prisma.crawlTask.findFirst({
        where: {
          keywordId: keyword.id
        },
        orderBy: {
          startedAt: 'desc'
        }
      });
      
      return {
        id: keyword.id,
        keyword: keyword.text,
        repositoriesCount: keyword._count.repositories,
        tasksCount: keyword._count.crawlTasks,
        lastCrawled: latestTask?.startedAt || '',
        lastStatus: latestTask?.status || '',
        createdAt: keyword.createdAt
      };
    }));
    
    // 转换为CSV
    const csv = convertToCSV(formattedKeywords);
    
    // 添加BOM标记，以便Excel正确识别UTF-8编码
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csv;
    
    // 设置响应头，使浏览器将响应作为文件下载
    const headers = new Headers();
    headers.append('Content-Type', 'text/csv; charset=utf-8');
    headers.append('Content-Disposition', 'attachment; filename=keywords.csv');
    
    return new NextResponse(csvWithBOM, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('导出关键词数据失败:', error);
    return NextResponse.json(
      { error: '导出关键词数据失败' },
      { status: 500 }
    );
  }
} 