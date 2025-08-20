'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, Hash, Filter } from 'lucide-react'

interface TagAnalysisProps {
  data: Record<string, number>
  title?: string
  isSimplified?: boolean
  onTagClick?: (tag: string) => void
}

export function TagAnalysis({ 
  data, 
  title = '标签分析',
  isSimplified = false,
  onTagClick
}: TagAnalysisProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  
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

  // 颜色配置
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ]

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag === selectedTag ? null : tag)
    onTagClick?.(tag)
  }

  const renderCustomTooltip = (props: any) => {
    if (props.active && props.payload && props.payload.length) {
      const data = props.payload[0]
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium">{data.payload.fullName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            使用次数: {data.value}
          </p>
        </div>
      )
    }
    return null
  }

  const totalTags = Object.keys(data || {}).length
  const totalCount = Object.values(data || {}).reduce((sum, count) => sum + count, 0)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              {title}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              显示前 {chartData.length} 个标签 (共 {totalTags} 个)
            </p>
          </div>
          {!isSimplified && (
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              筛选
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Hash className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无标签数据</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 图表 */}
            <div className={`${isSimplified ? 'h-48' : 'h-64'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: isSimplified ? 40 : 60,
                  }}
                >
                  <XAxis 
                    dataKey="displayName" 
                    angle={isSimplified ? 0 : -45}
                    textAnchor={isSimplified ? "middle" : "end"}
                    height={isSimplified ? 40 : 80}
                    interval={0}
                    tick={{ fontSize: isSimplified ? 10 : 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={renderCustomTooltip} />
                  <Bar 
                    dataKey="count" 
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data) => handleTagClick(data.fullName)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={selectedTag === entry.fullName ? '#1F2937' : colors[index % colors.length]}
                        opacity={selectedTag && selectedTag !== entry.fullName ? 0.6 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 标签云（非简化模式） */}
            {!isSimplified && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  热门标签
                </h4>
                <div className="flex flex-wrap gap-2">
                  {chartData.slice(0, 20).map((tag, index) => {
                    const isSelected = selectedTag === tag.fullName
                    const size = Math.max(12, Math.min(16, 12 + (tag.count / chartData[0].count) * 4))
                    
                    return (
                      <Badge
                        key={tag.fullName}
                        variant={isSelected ? "default" : "secondary"}
                        className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                          isSelected ? 'ring-2 ring-blue-500' : ''
                        }`}
                        style={{ 
                          fontSize: `${size}px`,
                          backgroundColor: isSelected ? colors[index % colors.length] : undefined
                        }}
                        onClick={() => handleTagClick(tag.fullName)}
                      >
                        {tag.fullName} ({tag.count})
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 统计信息 */}
            <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="font-medium">最热标签</div>
                  <div>{chartData[0]?.fullName || 'N/A'}</div>
                </div>
                <div>
                  <div className="font-medium">使用次数</div>
                  <div>{chartData[0]?.count || 0}</div>
                </div>
                <div>
                  <div className="font-medium">标签总数</div>
                  <div>{totalTags}</div>
                </div>
                <div>
                  <div className="font-medium">总使用次数</div>
                  <div>{totalCount}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
