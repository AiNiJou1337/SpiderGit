'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// 语言颜色映射
const languageColors = {
  'TypeScript': '#3178c6',
  'C++': '#f34b7d',
  'JavaScript': '#f7df1e',
  'C': '#555555',
  'Python': '#3572A5'
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
function prepareChartData(data) {
  return data.dates.map((date, index) => {
    const entry = { date };
    Object.entries(data.languages).forEach(([language, values]) => {
      entry[language] = values[index];
    });
    return entry;
  });
}

export function LanguageTrendsChart() {
  const [activeTab, setActiveTab] = useState('折线图')
  const [chartData, setChartData] = useState(prepareChartData(mockData))
  
  // 自定义工具提示显示
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="glass-card bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
      <CardHeader>
        <CardTitle>语言趋势分析</CardTitle>
        <CardDescription>不同编程语言的流行趋势变化</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="折线图" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="折线图">折线图</TabsTrigger>
            <TabsTrigger value="柱状图">柱状图</TabsTrigger>
          </TabsList>
          
          <TabsContent value="折线图" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {Object.keys(mockData.languages).map((language) => (
                  <Line
                    key={language}
                    type="monotone"
                    dataKey={language}
                    stroke={languageColors[language]}
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="柱状图" className="h-[400px]">
            {/* 柱状图实现可以后续添加 */}
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">柱状图视图开发中...</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 