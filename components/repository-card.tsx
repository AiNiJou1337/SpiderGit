import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export type Repository = {
  id?: number
  name: string
  owner: string
  fullName: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  todayStars: number
  url: string
  trendPeriod?: string
}

type RepositoryCardProps = {
  repository: Repository
  periodLabel?: string // 用于显示"今日新增"、"本周新增"或"本月新增"
}

export function RepositoryCard({ repository, periodLabel = "今日新增" }: RepositoryCardProps) {
  const getLanguageStyle = (language: string | null) => {
    if (!language) return {}
    
    // 根据不同语言返回不同的样式
    const styles: Record<string, string> = {
      JavaScript: "bg-yellow-100 text-yellow-800",
      TypeScript: "bg-blue-100 text-blue-800",
      Python: "bg-green-100 text-green-800",
      Java: "bg-orange-100 text-orange-800",
      "C++": "bg-purple-100 text-purple-800",
      "C#": "bg-indigo-100 text-indigo-800",
      Go: "bg-cyan-100 text-cyan-800",
      Rust: "bg-red-100 text-red-800",
      PHP: "bg-pink-100 text-pink-800",
      Ruby: "bg-rose-100 text-rose-800",
    }
    
    return styles[language] || "bg-gray-100 text-gray-800"
  }
  
  // 根据语言生成渐变色
  const getGradientByLanguage = (language: string | null): string => {
    if (!language) return "from-gray-500/10 to-slate-500/10"
    
    const gradients: Record<string, string> = {
      JavaScript: "from-yellow-500/10 to-amber-500/10",
      TypeScript: "from-blue-500/10 to-indigo-500/10",
      Python: "from-green-500/10 to-emerald-500/10",
      Java: "from-orange-500/10 to-amber-500/10",
      "C++": "from-purple-500/10 to-violet-500/10",
      "C#": "from-indigo-500/10 to-blue-500/10",
      Go: "from-cyan-500/10 to-blue-500/10",
      Rust: "from-red-500/10 to-rose-500/10",
      PHP: "from-pink-500/10 to-purple-500/10",
      Ruby: "from-rose-500/10 to-pink-500/10",
    }
    
    return gradients[language] || "from-gray-500/10 to-slate-500/10"
  }
  
  const gradient = getGradientByLanguage(repository.language)
  
  return (
    <Card className={`h-full flex flex-col glass-card bg-gradient-to-br ${gradient}`}>
      <CardHeader>
        <CardTitle className="truncate">{repository.name}</CardTitle>
        <CardDescription>{repository.owner}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm line-clamp-2 h-10">
          {repository.description || '没有描述'}
        </p>
        <div className="flex items-center mt-4 text-sm">
          <span className="mr-4">⭐ {repository.stars.toLocaleString()}</span>
          <span className="mr-4">🍴 {repository.forks.toLocaleString()}</span>
          {repository.language && (
            <span className={`px-2 py-1 rounded ${getLanguageStyle(repository.language)}`}>
              {repository.language}
            </span>
          )}
        </div>
        {repository.todayStars > 0 && (
          <div className="mt-2 text-sm text-green-600">
            {periodLabel}: +{repository.todayStars.toLocaleString()} 星
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={repository.url} target="_blank">查看项目</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}