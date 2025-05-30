'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface TagAnalysisProps {
  data: Record<string, number>
  title?: string
  isSimplified?: boolean
}

export function TagAnalysis({ 
  data, 
  title = '标签分析',
  isSimplified = false
}: TagAnalysisProps) {
  // 将标签数据转换为图表格式，并只显示前15个
  const chartData = useMemo(() => {
    return Object.entries(data || {})
      .map(([name, count]) => ({ 
        name,
        displayName: name.length > 15 ? `${name.slice(0, 12)}...` : name,
        fullName: name,
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, isSimplified ? 8 : 15)  // 简化模式显示前8个，完整模式显示前15个
  }, [data, isSimplified])

  // 动态计算图表高度
  const chartHeight = useMemo(() => {
    const baseHeight = isSimplified ? 56 : 72
    const itemHeight = isSimplified ? 30 : 35
    return Math.max(baseHeight, chartData.length * itemHeight)
  }, [chartData.length, isSimplified])

  // 颜色配置
  const colors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', 
    '#FF6B6B', '#4BC0C0', '#FF9F40', '#9966FF', '#FF6699',
    '#36A2EB', '#FF6384', '#4BC0C0', '#FF9F40', '#9966FF'
  ]

  // 自定义Tooltip内容
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="text-sm font-medium">{data.fullName}</p>
          <p className="text-sm text-gray-600">使用频率: {data.count} 次</p>
        </div>
      )
    }
    return null
  }

  return (
    <>
      {!chartData.length ? (
        <div className="text-center py-4 text-gray-500">没有标签分析数据</div>
      ) : (
        <>
          <div style={{ height: `${chartHeight}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <XAxis 
                  type="number"
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <YAxis 
                  type="category" 
                  dataKey="displayName" 
                  width={110}
                  tick={{ 
                    fontSize: 11,
                    fill: '#666',
                    textAnchor: 'end',
                  }}
                  tickFormatter={(value) => value}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  radius={[0, 4, 4, 0]}
                  barSize={isSimplified ? 16 : 20}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {!isSimplified && chartData.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">标签使用详情</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {chartData.map((item, index) => (
                  <div 
                    key={item.name}
                    className="flex justify-between items-center p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span 
                      className="font-medium truncate mr-2" 
                      style={{ color: colors[index % colors.length] }}
                      title={item.fullName}
                    >
                      {item.displayName}
                    </span>
                    <span className="text-gray-600 text-sm whitespace-nowrap">
                      {item.count.toLocaleString()} 次
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
} 