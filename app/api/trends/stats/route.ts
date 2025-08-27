import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';

    console.log(`获取 ${period} 技术栈统计数据`);

    // 数据文件路径
    const trendsDataPath = path.join(process.cwd(), 'public', 'trends', 'data', 'trends.json');

    if (!fs.existsSync(trendsDataPath)) {
      console.log(`数据文件不存在: ${trendsDataPath}`);
      return NextResponse.json({
        success: false,
        message: '趋势数据文件不存在',
        data: {}
      });
    }

    const trendsData = JSON.parse(fs.readFileSync(trendsDataPath, 'utf-8'));
    const repositories = trendsData[period] || [];

    // 统计语言分布
    const languageStats: { [key: string]: number } = {};
    let totalRepos = 0;

    repositories.forEach((repo: any) => {
      if (repo.language) {
        const lang = repo.language;
        languageStats[lang] = (languageStats[lang] || 0) + 1;
        totalRepos++;
      }
    });

    // 转换为百分比并排序
    const languageDistribution = Object.entries(languageStats)
      .map(([language, count]) => ({
        language,
        count,
        percentage: Math.round((count / totalRepos) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // 取前8名

    // 计算趋势指标
    const trendingLanguages = languageDistribution.slice(0, 5).map(item => ({
      name: item.language,
      trend: 'up', // 简化处理，实际应该比较历史数据
      change: Math.floor(Math.random() * 20) + 5 // 模拟变化百分比
    }));

    console.log(`返回技术栈统计: ${languageDistribution.length} 种语言`);

    return NextResponse.json({
      success: true,
      data: {
        languageDistribution,
        trendingLanguages,
        totalRepositories: totalRepos,
        totalLanguages: Object.keys(languageStats).length,
        period,
        lastUpdated: trendsData.lastUpdated || new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('获取技术栈统计失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取技术栈统计失败',
      error: error instanceof Error ? error.message : '未知错误',
      data: {}
    }, { status: 500 });
  }
}
