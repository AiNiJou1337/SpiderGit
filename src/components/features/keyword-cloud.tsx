'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface KeywordCloudProps {
  data?: any;
  title?: string
  maxKeywords?: number
  keyPrefix?: string
  onKeywordClick?: (keyword: string) => void
}

export function KeywordCloud({ 
  data = {}, 
  title = '关键词分析', 
  maxKeywords = 50,
  keyPrefix = 'kw',
  onKeywordClick
}: KeywordCloudProps) {
  // 提取关键词数据，处理不同的数据结构
  let keywords: Record<string, number> = {};
  
  // 处理数据的不同可能格式
  if ('keywords' in data && data.keywords) {
    // 直接包含keywords字段的情况
    keywords = data.keywords;
  } else if ('charts' in data && data.charts) {
    // 处理analysis_Monitoring_API.json类型的结构
    if (data.charts.tag_analysis?.data) {
      keywords = data.charts.tag_analysis.data;
    } else if (data.charts.description_keywords?.data) {
      keywords = data.charts.description_keywords.data;
    }
  } else if (typeof data === 'object' && data !== null) {
    // 直接是关键词对象的情况
    keywords = data;
  }

  // 转换为数组并排序
  const keywordArray = Object.entries(keywords)
    .map(([word, count]) => ({ word, count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxKeywords);

  // 计算字体大小
  const maxCount = keywordArray[0]?.count || 1;
  const minCount = keywordArray[keywordArray.length - 1]?.count || 1;
  
  const getFontSize = (count: number) => {
    const ratio = (count - minCount) / (maxCount - minCount);
    return Math.max(12, 12 + ratio * 16); // 12px 到 28px
  };

  // 获取颜色
  const getColor = (count: number) => {
    const ratio = (count - minCount) / (maxCount - minCount);
    if (ratio > 0.8) return 'bg-blue-600 hover:bg-blue-700';
    if (ratio > 0.6) return 'bg-blue-500 hover:bg-blue-600';
    if (ratio > 0.4) return 'bg-blue-400 hover:bg-blue-500';
    if (ratio > 0.2) return 'bg-blue-300 hover:bg-blue-400';
    return 'bg-blue-200 hover:bg-blue-300';
  };

  if (keywordArray.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            暂无关键词数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          共 {keywordArray.length} 个关键词，按出现频次排序
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {keywordArray.map(({ word, count }, index) => (
            <Badge
              key={`${keyPrefix}-${word}-${index}`}
              variant="secondary"
              className={`
                ${getColor(count)} 
                text-white cursor-pointer transition-all duration-200
                hover:scale-105 hover:shadow-md
              `}
              style={{ 
                fontSize: `${getFontSize(count)}px`,
                padding: '4px 8px'
              }}
              onClick={() => onKeywordClick?.(word)}
              title={`${word}: ${count} 次`}
            >
              {word}
              <span className="ml-1 text-xs opacity-75">
                {count}
              </span>
            </Badge>
          ))}
        </div>
        
        {keywordArray.length > 0 && keywordArray[0] && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center justify-between">
              <span>最热门: {keywordArray[0].word} ({keywordArray[0].count})</span>
              <span>总关键词: {keywordArray.length}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
