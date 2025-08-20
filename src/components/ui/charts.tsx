"use client"

import * as React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface BarChartComponentProps {
  data: any[]
  dataKey: string
  nameKey: string
  title?: string
  color?: string
  height?: number
}

interface PieChartComponentProps {
  data: any[]
  dataKey: string
  nameKey: string
  title?: string
  colors?: string[]
  height?: number
}

export function BarChartComponent({ 
  data, 
  dataKey, 
  nameKey, 
  title, 
  color = "#8884d8",
  height = 300 
}: BarChartComponentProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={nameKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={dataKey} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PieChartComponent({ 
  data, 
  dataKey, 
  nameKey, 
  title, 
  colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF'],
  height = 300 
}: PieChartComponentProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
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
  )
}

interface LineChartComponentProps {
  data: any[]
  dataKey: string
  nameKey: string
  title?: string
  color?: string
  height?: number
}

export function LineChartComponent({
  data,
  dataKey,
  nameKey,
  title,
  color = "#8884d8",
  height = 300
}: LineChartComponentProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={nameKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
