import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Navbar } from '@/components/navbar'
import { RepositoryCard, type Repository } from '@/components/repository-card'
import { Button } from '@/components/ui/button'

async function getRepositories(period: string = 'daily'): Promise<{ repositories: Repository[], languages: any[] }> {
  // 在实际部署环境中使用绝对URL
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000'
  
  try {
    const res = await fetch(`${baseUrl}/api/trending?period=${period}`, { 
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

export default async function Home() {
  return (
    <main className="container mx-auto py-6">
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-2">GitHub Trending 数据抓取</h1>
        <p className="text-muted-foreground mb-6">实时追踪GitHub上最热门的开源项目</p>
        
        <Navbar />
        
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">今日趋势</TabsTrigger>
            <TabsTrigger value="weekly">本周趋势</TabsTrigger>
            <TabsTrigger value="monthly">本月趋势</TabsTrigger>
          </TabsList>
          
          {/* 今日趋势内容 */}
          <TabsContent value="daily">
            <DailyContent />          
          </TabsContent>
          
          {/* 本周趋势内容 */}
          <TabsContent value="weekly">
            <WeeklyContent />
          </TabsContent>
          
          {/* 本月趋势内容 */}
          <TabsContent value="monthly">
            <MonthlyContent />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

// 服务器组件 - 今日趋势内容
async function DailyContent() {
  const { repositories, languages } = await getRepositories('daily')
  return (
    <>
      {repositories && repositories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => (
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
      
      {languages && languages.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">按语言筛选</h2>
          <div className="flex flex-wrap gap-2">
            <Link 
              href="/"
              className="bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-full text-sm"
            >
              全部
            </Link>
            {languages.map((lang: any) => (
              <Link 
                key={lang.language} 
                href={`/?tab=daily&language=${lang.language}`}
                className="bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-full text-sm"
              >
                {lang.language}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// 服务器组件 - 本周趋势内容
async function WeeklyContent() {
  const { repositories, languages } = await getRepositories('weekly')
  return (
    <>
      {repositories && repositories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => (
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
              href="/?tab=weekly"
              className="bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-full text-sm"
            >
              全部
            </Link>
            {languages.map((lang: any) => (
              <Link 
                key={lang.language} 
                href={`/?tab=weekly&language=${lang.language}`}
                className="bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-full text-sm"
              >
                {lang.language}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// 服务器组件 - 本月趋势内容
async function MonthlyContent() {
  const { repositories, languages } = await getRepositories('monthly')
  return (
    <>
      {repositories && repositories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => (
            <RepositoryCard 
              key={repo.fullName} 
              repository={repo} 
              periodLabel="本月新增" 
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
              href="/?tab=monthly"
              className="bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-full text-sm"
            >
              全部
            </Link>
            {languages.map((lang: any) => (
              <Link 
                key={lang.language} 
                href={`/?tab=monthly&language=${lang.language}`}
                className="bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-full text-sm"
              >
                {lang.language}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
