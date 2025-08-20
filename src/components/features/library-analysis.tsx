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
        <p className="text-sm text-gray-600 dark:text-gray-400">
          显示最常用的 {chartData.length} 个库/包
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            暂无库分析数据
          </div>
        ) : (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60,
                }}
              >
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={colors[index % colors.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {chartData.length > 0 && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center justify-between">
              <span>最常用: {chartData[0]?.name} ({chartData[0]?.count} 次)</span>
              <span>总计: {chartData.reduce((sum, item) => sum + item.count, 0)} 次使用</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
