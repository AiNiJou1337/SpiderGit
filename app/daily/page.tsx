import Link from 'next/link'
import { TrendsNavbar } from '@/components/trends-navbar'
import { RepositoryCard } from '@/components/repository-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

async function getRepositories() {
  // 在实际部署环境中使用绝对URL
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000'
  
  try {
    const res = await fetch(`${baseUrl}/api/trending?period=daily`, { 
      next: { revalidate: 3600 } // 每小时重新验证一次
    })
    
    if (!res.ok) {
      throw new Error('获取数据失败')
    }
    
    return res.json()
  } catch (error) {
    console.error('获取仓库数据出错:', error)
    return { repositories: [], languages: [] }
  }
}

export default async function DailyTrending() {
  const { repositories, languages } = await getRepositories()
  
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
      
      {repositories && repositories.length > 0 ? (
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
          <p className="text-muted-foreground">暂无数据或正在加载中...</p>
        </div>
      )}
    </div>
  )
}