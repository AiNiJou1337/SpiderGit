'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface LibraryAnalysisProps {
  libraryData: Record<string, number>
  title?: string
}

export function LibraryAnalysis({ 
  libraryData, 
  title = '常用库/包分析' 
}: LibraryAnalysisProps) {
  // 将库数据转换为图表格式
  const chartData = Object.entries(libraryData || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)  // 只显示前20个

  // 颜色配置
  const colors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', 
    '#FF6B6B', '#4BC0C0', '#FF9F40', '#9966FF', '#FF6699',
    '#36A2EB', '#FF6384', '#4BC0C0', '#FF9F40', '#9966FF'
  ]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!chartData.length ? (
          <div className="text-center py-4 text-gray-500">没有库/包分析数据</div>
        ) : (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
              >
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value) => [`${value} 个文件中使用`, '使用频率']}
                  labelFormatter={(label) => `库: ${label}`}
                />
                <Bar 
                  dataKey="count" 
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">库/包使用统计</h4>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {chartData.slice(0, 10).map((item, index) => (
                <div 
                  key={item.name}
                  className="flex justify-between items-center p-2 rounded border"
                >
                  <span className="font-medium" style={{ color: colors[index % colors.length] }}>
                    {item.name}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {item.count} 次
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 