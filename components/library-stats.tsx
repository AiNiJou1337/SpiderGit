'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface LibraryStatsProps {
  libraryData: Record<string, number>
  title?: string
}

export function LibraryStats({ 
  libraryData, 
  title = '库使用统计' 
}: LibraryStatsProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  
  // 颜色配置
  const colors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', 
    '#FF6B6B', '#4BC0C0', '#FF9F40', '#9966FF', '#FF6699'
  ]
  
  // 准备饼图数据
  const prepareChartData = () => {
    const sortedEntries = Object.entries(libraryData || {})
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    
    // 取前9个库，其他的归为"其他"类别
    if (sortedEntries.length <= 10) {
      return sortedEntries
    }
    
    const topEntries = sortedEntries.slice(0, 9)
    const otherCount = sortedEntries.slice(9).reduce((sum, item) => sum + item.count, 0)
    
    return [
      ...topEntries,
      { name: '其他', count: otherCount }
    ]
  }
  
  const chartData = prepareChartData()
  
  // 计算总使用量
  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0)
  
  // 计算扇形图的圆环内部展示数据
  const centerText = {
    totalCount,
    libraryCount: Object.keys(libraryData || {}).length
  }
  
  // 处理鼠标悬停
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }
  
  const onPieLeave = () => {
    setActiveIndex(null)
  }
  
  // 自定义tooltip
  const renderTooltip = (props: any) => {
    const { active, payload } = props
    
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-gray-700">{data.count} 次使用</p>
          <p className="text-gray-500 text-sm">
            {((data.count / totalCount) * 100).toFixed(1)}%
          </p>
        </div>
      )
    }
    
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!chartData.length ? (
          <div className="text-center py-4 text-gray-500">没有库/包使用数据</div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={colors[index % colors.length]} 
                      stroke={activeIndex === index ? '#151515' : '#fff'}
                      strokeWidth={activeIndex === index ? 2 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip content={renderTooltip} />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="flex justify-center -mt-40 relative z-10 pointer-events-none">
              <div className="text-center">
                <p className="text-3xl font-bold">{centerText.libraryCount}</p>
                <p className="text-sm text-gray-500">库/包总数</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h4 className="text-sm font-medium mb-2">库使用频率统计</h4>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <div className="p-2 rounded border font-medium">
              共扫描 {totalCount} 次库引用，涉及 {centerText.libraryCount} 个不同的库/包
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded border bg-gray-50">
                <span className="text-gray-500">最流行库:</span>
                <span className="font-medium ml-2">
                  {chartData[0]?.name || '无数据'}
                </span>
              </div>
              <div className="p-2 rounded border bg-gray-50">
                <span className="text-gray-500">使用率:</span>
                <span className="font-medium ml-2">
                  {chartData[0] ? ((chartData[0].count / totalCount) * 100).toFixed(1) + '%' : '无数据'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}