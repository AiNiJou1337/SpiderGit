import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { RepositoryCard } from '@/components/repository-card'

async function getRepositories() {
  // 在实际部署环境中使用绝对URL
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000'
  
  try {
    const res = await fetch(`${baseUrl}/api/trending?period=weekly`, { 
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

export default async function WeeklyTrending() {
  const { repositories, languages } = await getRepositories()
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-2">GitHub 每周趋势</h1>
      <p className="text-muted-foreground mb-6">展示过去一周内最受欢迎的GitHub项目</p>
      
      <Navbar />
      
      {repositories && repositories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo: any) => (
            <RepositoryCard 
              key={repo.fullName} 
              repository={repo} 
              periodLabel="本周新增" 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">暂无数据或正在加载中...</p>
        </div>
      )}
      
      {languages && languages.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">按语言筛选</h2>
          <div className="flex flex-wrap gap-2">
            <Link 
              href="/weekly"
              className="bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-full text-sm"
            >
              全部
            </Link>
            {languages.map((lang: any) => (
              <Link 
                key={lang.language} 
                href={`/weekly?language=${lang.language}`}
                className="bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-full text-sm"
              >
                {lang.language}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}