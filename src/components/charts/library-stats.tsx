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
    const topLibraries = sortedEntries.slice(0, 9)
    const otherLibraries = sortedEntries.slice(9)
    
    const chartData = [...topLibraries]
    
    if (otherLibraries.length > 0) {
      const otherCount = otherLibraries.reduce((sum, lib) => sum + lib.count, 0)
      chartData.push({ name: '其他', count: otherCount })
    }
    
    return chartData
  }
  
  const chartData = prepareChartData()
  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0)
  
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }
  
  const onPieLeave = () => {
    setActiveIndex(null)
  }
  
  const renderCustomTooltip = (props: any) => {
    if (props.active && props.payload && props.payload.length) {
      const data = props.payload[0]
      const percentage = ((data.value / totalCount) * 100).toFixed(1)
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            使用次数: {data.value}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            占比: {percentage}%
          </p>
        </div>
      )
    }
    return null
  }
  
  const renderCustomLabel = (entry: any) => {
    const percentage = ((entry.count / totalCount) * 100).toFixed(1)
    return `${percentage}%`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          总计 {chartData.length} 个库，{totalCount} 次使用
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            暂无库统计数据
          </div>
        ) : (
          <div className="space-y-6">
            {/* 饼图 */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={colors[index % colors.length]}
                        stroke={activeIndex === index ? '#333' : 'none'}
                        strokeWidth={activeIndex === index ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={renderCustomTooltip} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => (
                      <span style={{ color: entry.color }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* 详细列表 */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                详细统计
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {chartData.map((item, index) => {
                  const percentage = ((item.count / totalCount) * 100).toFixed(1)
                  return (
                    <div 
                      key={item.name}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                    >
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{item.count}</div>
                        <div className="text-xs text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* 总结信息 */}
            <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-4">
              <div className="flex justify-between">
                <span>最常用: {chartData[0]?.name} ({chartData[0]?.count} 次)</span>
                <span>总使用次数: {totalCount}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
