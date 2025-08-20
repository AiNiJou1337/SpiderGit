'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import { languageColors } from '@/lib/utils/language-colors'

// 选择显示的语言（与趋势图保持一致）
const displayLanguages = {
  'TypeScript': languageColors['TypeScript'],
  'C++': languageColors['C++'],
  'JavaScript': languageColors['JavaScript'],
  'C': languageColors['C'],
  'Python': languageColors['Python']
}

// 模拟数据
const mockData = {
  dates: ['5月2日', '5月4日', '5月6日', '5月8日', '5月10日', '5月12日', '5月14日', '5月16日', '5月18日', '5月20日', '5月22日', '5月24日', '5月26日', '5月28日', '5月31日'],
  languages: {
    'TypeScript': [1.2, 1.5, 1.8, 2.1, 2.3, 2.5, 2.8, 3.0, 3.2, 3.0, 2.8, 3.1, 3.4, 3.6, 3.8],
    'C++': [0.8, 0.9, 1.2, 1.3, 1.5, 1.6, 1.7, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8, 1.7, 1.6],
    'JavaScript': [2.5, 2.6, 2.7, 2.8, 2.9, 2.8, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4, 3.5],
    'C': [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9],
    'Python': [1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2, 3.4, 3.6, 3.8, 3.9, 3.7, 3.5, 3.3]
  }
}

// 将数据转换为图表需要的格式
function prepareChartData(data: typeof mockData) {
  return data.dates.map((date, index) => {
    const point: any = { date }
    Object.entries(data.languages).forEach(([language, values]) => {
      point[language] = values[index]
    })
    return point
  })
}

interface LanguageTrendsChartProps {
  className?: string
}

export default function LanguageTrendsChart({ className }: LanguageTrendsChartProps) {
  const [chartData, setChartData] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('15days')

  useEffect(() => {
    // 模拟数据加载
    const data = prepareChartData(mockData)
    setChartData(data)
  }, [selectedPeriod])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>编程语言趋势</CardTitle>
        <CardDescription>
          不同编程语言在 GitHub 趋势中的表现对比
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod} className="mb-4">
          <TabsList>
            <TabsTrigger value="7days">7天</TabsTrigger>
            <TabsTrigger value="15days">15天</TabsTrigger>
            <TabsTrigger value="30days">30天</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: '趋势指数', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
              <Legend />
              
              {Object.entries(displayLanguages).map(([language, color]) => (
                <Line
                  key={language}
                  type="monotone"
                  dataKey={language}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(displayLanguages).map(([language, color]) => (
            <div key={language} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {language}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
