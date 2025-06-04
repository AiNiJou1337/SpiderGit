'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface KeywordCloudProps {
  data?: any;
  title?: string
  maxKeywords?: number
  keyPrefix?: string
}

export function KeywordCloud({ 
  data = {}, 
  title = '关键词分析', 
  maxKeywords = 50,
  keyPrefix = 'kw'
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
    // 直接就是关键词对象的情况
    keywords = data;
  }
  
  // 没有关键词数据时的提示
  if (!keywords || Object.keys(keywords).length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            没有关键词数据
          </div>
        </CardContent>
      </Card>
    )
  }

  // 将关键词数据转换为数组
  const keywordArray = Object.entries(keywords)
    .map(([word, count]) => ({ word, count: typeof count === 'number' ? count : 0 }))
    .filter(item => item.count > 0) // 过滤掉计数为0的项
    .sort((a, b) => b.count - a.count)
    .slice(0, maxKeywords)

  // 如果没有有效数据，显示提示
  if (keywordArray.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            没有有效的关键词数据
          </div>
        </CardContent>
      </Card>
    )
  }

  // 找出最大和最小频率，用于计算字体大小
  const maxCount = Math.max(...keywordArray.map(k => k.count))
  const minCount = Math.min(...keywordArray.map(k => k.count))
  
  // 计算每个关键词的字体大小（基于频率）
  const getFontSize = (count: number) => {
    const minSize = 0.8
    const maxSize = 2.0
    
    if (maxCount === minCount) return 1.2
    
    // 线性映射计算字体大小
    return minSize + (count - minCount) / (maxCount - minCount) * (maxSize - minSize)
  }
  
  // 为关键词分配随机颜色
  const getRandomColor = (word: string) => {
    // 根据单词生成简单哈希
    let hash = 0
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i)
      hash &= hash // 转换为32位整数
    }
    
    // 预定义的颜色集合
    const colors = [
      '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', 
      '#FF6B6B', '#4BC0C0', '#FF9F40', '#9966FF', '#FF6699',
      '#36A2EB', '#FF6384', '#4BC0C0', '#FF9F40', '#9966FF'
    ]
    
    // 根据哈希选择颜色
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 justify-center py-4">
          {keywordArray.map(({ word, count }, index) => (
            <span
              key={`${keyPrefix}-${word}-${index}`}
              className="inline-block transition-transform hover:scale-110"
              style={{
                fontSize: `${getFontSize(count)}rem`,
                color: getRandomColor(word),
                margin: '0.25rem',
                fontWeight: count > (maxCount * 0.7) ? 'bold' : 'normal',
                cursor: 'default'
              }}
              title={`${word}: ${count}次`}
            >
              {word}
            </span>
          ))}
        </div>
        
        {/* 关键词频率表格 - 显示前10个 */}
        <div className="mt-6 border rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  关键词
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  出现频率
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {keywordArray.slice(0, 10).map(({ word, count }, index) => (
                <tr key={`${keyPrefix}-table-${word}-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline" style={{ color: getRandomColor(word) }}>
                      {word}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {count}次
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
} 