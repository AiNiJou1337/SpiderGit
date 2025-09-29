import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// 生成更多趋势数据
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 开始生成更多趋势数据...')
    
    const dataPath = path.join(process.cwd(), 'public', 'trends', 'data', 'trends.json')
    
    // 读取现有数据
    let existingData = { daily: [], weekly: [], monthly: [] }
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf8')
      existingData = JSON.parse(rawData)
    }
    
    // 热门项目模板
    const popularRepos = [
      { name: 'react', owner: 'facebook', language: 'JavaScript', baseStars: 220000, description: 'React JavaScript库，用于构建用户界面' },
      { name: 'vue', owner: 'vuejs', language: 'JavaScript', baseStars: 205000, description: '渐进式JavaScript框架' },
      { name: 'angular', owner: 'angular', language: 'TypeScript', baseStars: 93000, description: 'Angular Web应用框架' },
      { name: 'svelte', owner: 'sveltejs', language: 'JavaScript', baseStars: 75000, description: '编译时优化的Web框架' },
      { name: 'tensorflow', owner: 'tensorflow', language: 'Python', baseStars: 180000, description: '机器学习和深度学习框架' },
      { name: 'pytorch', owner: 'pytorch', language: 'Python', baseStars: 75000, description: 'PyTorch深度学习框架' },
      { name: 'django', owner: 'django', language: 'Python', baseStars: 75000, description: 'Python Web框架' },
      { name: 'flask', owner: 'pallets', language: 'Python', baseStars: 65000, description: '轻量级Python Web框架' },
      { name: 'express', owner: 'expressjs', language: 'JavaScript', baseStars: 63000, description: 'Node.js Web应用框架' },
      { name: 'spring-boot', owner: 'spring-projects', language: 'Java', baseStars: 69000, description: 'Java应用开发框架' },
      { name: 'laravel', owner: 'laravel', language: 'PHP', baseStars: 76000, description: 'PHP Web应用框架' },
      { name: 'rails', owner: 'rails', language: 'Ruby', baseStars: 55000, description: 'Ruby on Rails Web框架' },
      { name: 'gin', owner: 'gin-gonic', language: 'Go', baseStars: 75000, description: 'Go Web框架' },
      { name: 'fiber', owner: 'gofiber', language: 'Go', baseStars: 30000, description: '快速的Go Web框架' },
      { name: 'actix-web', owner: 'actix', language: 'Rust', baseStars: 20000, description: 'Rust Web框架' },
      { name: 'rocket', owner: 'SergioBenitez', language: 'Rust', baseStars: 23000, description: 'Rust Web框架' },
      { name: 'dotnet', owner: 'dotnet', language: 'C#', baseStars: 14000, description: '.NET开发平台' },
      { name: 'aspnetcore', owner: 'dotnet', language: 'C#', baseStars: 34000, description: 'ASP.NET Core框架' },
      { name: 'electron', owner: 'electron', language: 'C++', baseStars: 112000, description: '跨平台桌面应用框架' },
      { name: 'tauri', owner: 'tauri-apps', language: 'Rust', baseStars: 75000, description: 'Rust桌面应用框架' },
      { name: 'nextjs', owner: 'vercel', language: 'JavaScript', baseStars: 118000, description: 'React全栈框架' },
      { name: 'nuxtjs', owner: 'nuxt', language: 'JavaScript', baseStars: 50000, description: 'Vue.js全栈框架' },
      { name: 'gatsby', owner: 'gatsbyjs', language: 'JavaScript', baseStars: 55000, description: 'React静态站点生成器' },
      { name: 'vite', owner: 'vitejs', language: 'JavaScript', baseStars: 65000, description: '快速的前端构建工具' },
      { name: 'webpack', owner: 'webpack', language: 'JavaScript', baseStars: 64000, description: '模块打包工具' },
      { name: 'babel', owner: 'babel', language: 'JavaScript', baseStars: 43000, description: 'JavaScript编译器' },
      { name: 'eslint', owner: 'eslint', language: 'JavaScript', baseStars: 24000, description: 'JavaScript代码检查工具' },
      { name: 'prettier', owner: 'prettier', language: 'JavaScript', baseStars: 48000, description: '代码格式化工具' },
      { name: 'jest', owner: 'facebook', language: 'JavaScript', baseStars: 43000, description: 'JavaScript测试框架' },
      { name: 'cypress', owner: 'cypress-io', language: 'JavaScript', baseStars: 46000, description: '端到端测试框架' }
    ]
    
    // 为每个时间段生成数据
    const periods = ['daily', 'weekly', 'monthly']
    const newData: any = { ...existingData }
    
    periods.forEach(period => {
      const multiplier = period === 'daily' ? 0.8 : period === 'weekly' ? 1.2 : 1.8
      const targetCount = period === 'daily' ? 100 : period === 'weekly' ? 100 : 100
      
      // 保留现有数据
      const existingRepos = existingData[period as keyof typeof existingData] || []
      const newRepos = []
      
      // 生成新数据
      for (let i = 0; i < Math.max(0, targetCount - existingRepos.length); i++) {
        const template = popularRepos[i % popularRepos.length]
        if (!template) continue; // 添加检查以避免undefined错误
        
        const variation = Math.random() * 0.4 + 0.8 // 0.8-1.2的变化
        const timeVariation = Math.random() * 0.3 + 0.85 // 时间相关变化
        
        const stars = Math.floor((template.baseStars || 0) * variation * multiplier * timeVariation)
        const forks = Math.floor(stars * (0.1 + Math.random() * 0.1)) // 10-20%的fork率
        const todayStars = Math.floor(stars * (0.005 + Math.random() * 0.015)) // 0.5-2%的日增长
        
        const repo = {
          id: existingRepos.length + i + 1,
          name: i < popularRepos.length ? (template.name || '') : `${template.name || ''}-${period}-${i + 1}`,
          owner: template.owner || '',
          fullName: i < popularRepos.length ? 
            `${template.owner || ''}/${template.name || ''}` : 
            `${template.owner || ''}/${template.name || ''}-${period}-${i + 1}`,
          description: template.description || '',
          language: template.language || '',
          stars: stars,
          stargazers_count: stars,
          forks: forks,
          forks_count: forks,
          todayStars: todayStars,
          url: i < popularRepos.length ? 
            `https://github.com/${template.owner || ''}/${template.name || ''}` :
            `https://github.com/${template.owner || ''}/${template.name || ''}-${period}-${i + 1}`,
          updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          trendPeriod: period
        }
        
        newRepos.push(repo)
      }
      
      // 合并数据并按stars排序
      newData[period as keyof typeof newData] = [...existingRepos, ...newRepos]
        .sort((a: any, b: any) => (b.stars || 0) - (a.stars || 0))
        .slice(0, targetCount)
      
      console.log(`📊 ${period} 数据更新: ${newData[period as keyof typeof newData].length} 个项目`)
    })
    
    // 更新元数据
    const finalData = {
      ...newData,
      lastUpdated: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        dailyCount: newData.daily.length,
        weeklyCount: newData.weekly.length,
        monthlyCount: newData.monthly.length,
        totalCount: newData.daily.length + newData.weekly.length + newData.monthly.length,
        generatedAt: new Date().toISOString()
      },
      languages: {
        JavaScript: 250,
        Python: 180,
        TypeScript: 160,
        Go: 120,
        Java: 110,
        'C++': 100,
        Rust: 90,
        PHP: 85,
        'C#': 80,
        Ruby: 75,
        HTML: 70,
        Dart: 65,
        C: 60
      }
    }
    
    // 写入文件
    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2), 'utf8')
    
    console.log('✅ 趋势数据生成完成')
    console.log(`📈 每日趋势: ${finalData.daily.length} 个项目`)
    console.log(`📊 每周趋势: ${finalData.weekly.length} 个项目`)
    console.log(`📉 每月趋势: ${finalData.monthly.length} 个项目`)
    
    return NextResponse.json({
      success: true,
      message: '趋势数据生成完成',
      data: {
        dailyCount: finalData.daily.length,
        weeklyCount: finalData.weekly.length,
        monthlyCount: finalData.monthly.length,
        totalCount: finalData.metadata.totalCount
      }
    })
    
  } catch (error) {
    console.error('生成趋势数据失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '生成趋势数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
