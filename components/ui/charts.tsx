'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  PieChart, 
  Pie,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts'

// 颜色配置
const colors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
]

// 柱状图组件
export function BarChartComponent({
  data,
  title,
  description,
  xAxisKey = 'name',
  yAxisKey = 'count',
  layout = 'vertical',
  height = 300
}: {
  data: any[]
  title?: string
  description?: string
  xAxisKey?: string
  yAxisKey?: string
  layout?: 'vertical' | 'horizontal'
  height?: number
}) {
  return (
    <Card className="chart-card">
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      <CardContent>
        <div style={{ height }} className="chart-container">
          <ResponsiveContainer width="100%" height="100%" className="chart-component-wrapper">
            <BarChart 
              data={data} 
              layout={layout}
              margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
            >
              <XAxis 
                type={layout === 'vertical' ? 'number' : 'category'} 
                dataKey={layout === 'vertical' ? yAxisKey : xAxisKey}
              />
              <YAxis 
                type={layout === 'vertical' ? 'category' : 'number'} 
                dataKey={layout === 'vertical' ? xAxisKey : yAxisKey}
                width={layout === 'vertical' ? 120 : undefined}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Bar 
                dataKey={layout === 'vertical' ? yAxisKey : xAxisKey} 
                radius={[0, 4, 4, 0]}
                barSize={20}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// 折线图组件
export function LineChartComponent({
  data,
  title,
  description,
  xAxisKey = 'date',
  yAxisKey = 'count',
  height = 300
}: {
  data: any[]
  title?: string
  description?: string
  xAxisKey?: string
  yAxisKey?: string
  height?: number
}) {
  return (
    <Card className="chart-card">
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      <CardContent>
        <div style={{ height }} className="chart-container">
          <ResponsiveContainer width="100%" height="100%" className="chart-component-wrapper">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis 
                dataKey={xAxisKey}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey={yAxisKey}
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// 饼图组件
export function PieChartComponent({
  data,
  title,
  description,
  nameKey = 'name',
  valueKey = 'count',
  height = 300
}: {
  data: any[]
  title?: string
  description?: string
  nameKey?: string
  valueKey?: string
  height?: number
}) {
  return (
    <Card className="chart-card">
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      <CardContent>
        <div style={{ height }} className="chart-container">
          <ResponsiveContainer width="100%" height="100%" className="chart-component-wrapper">
            <PieChart>
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}