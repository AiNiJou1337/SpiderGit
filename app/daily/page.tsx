'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendsNavbar } from '@/components/layout/trends-navbar'
import { RepositoryCard } from '@/components/features/repository-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DailyTrending() {
  const [repositories, setRepositories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRepositories() {
      try {
        const res = await fetch('/api/trending?period=daily')

        if (!res.ok) {
          throw new Error('获取数据失败')
        }

        const data = await res.json()
        setRepositories(data.repositories || [])
      } catch (error) {
        console.error('获取仓库数据出错:', error)
        setError('获取数据失败')
      } finally {
        setLoading(false)
      }
    }

    fetchRepositories()
  }, [])
  
  return (
    <div className="container mx-auto py-6">
      {/* 标题区域使用卡片和渐变背景 */}
      <Card className="glass-card bg-gradient-to-br from-blue-500/10 to-indigo-500/10 mb-6">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">GitHub 每日趋势</CardTitle>
          <CardDescription className="text-lg">
            展示过去24小时内最受欢迎的GitHub项目
          </CardDescription>
        </CardHeader>
      </Card>
      
      <TrendsNavbar />

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">正在加载中...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
        </div>
      ) : repositories && repositories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {repositories.map((repo: any) => (
            <RepositoryCard
              key={repo.fullName}
              repository={repo}
              periodLabel="今日新增"
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">暂无数据</p>
        </div>
      )}
    </div>
  )
}