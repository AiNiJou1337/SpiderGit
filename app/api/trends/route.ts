import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';
    const language = searchParams.get('language') || 'all';
    const limit = parseInt(searchParams.get('limit') || '300');

    console.log(`获取 ${period} 趋势数据, 语言: ${language}, 限制: ${limit}`);

    // 数据文件路径
    const trendsDataPath = path.join(process.cwd(), 'public', 'trends', 'data', 'trends.json');

    // 从主数据文件获取数据
    if (!fs.existsSync(trendsDataPath)) {
      console.log(`主数据文件不存在: ${trendsDataPath}`);
      return NextResponse.json({
        success: false,
        message: '趋势数据文件不存在',
        data: [],
        period,
        language,
        limit,
        timeSeries: false
      });
    }

    const trendsData = JSON.parse(fs.readFileSync(trendsDataPath, 'utf-8'));
    let repositories = trendsData[period] || [];

    // 语言过滤
    if (language && language !== 'all') {
      repositories = repositories.filter((repo: any) => 
        repo.language && repo.language.toLowerCase() === language.toLowerCase()
      );
    }

    // 限制数量
    if (limit > 0) {
      repositories = repositories.slice(0, limit);
    }

    console.log(`从主数据文件返回 ${repositories.length} 个仓库`);

    return NextResponse.json({
      success: true,
      data: repositories,
      metadata: {
        period,
        language,
        total: repositories.length,
        lastUpdated: trendsData.lastUpdated || new Date().toISOString()
      },
      period,
      language,
      limit
    });

  } catch (error) {
    console.error('获取趋势数据失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取趋势数据失败',
      error: error instanceof Error ? error.message : '未知错误',
      data: []
    }, { status: 500 });
  }
}
