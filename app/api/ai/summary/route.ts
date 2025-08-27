import { NextRequest, NextResponse } from 'next/server'

// 使用免费的Groq API
const GROQ_API_KEY = process.env.GROQ_API_KEY || 'gsk_your_api_key_here'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { keyword, totalRepos, topRepos, languageDistribution, qualityDistribution } = data

    // 构建分析提示词
    const prompt = `请基于以下GitHub仓库数据，生成一份专业的技术分析报告：

关键词：${keyword}
总仓库数：${totalRepos}

顶级仓库（前10个）：
${topRepos.map((repo: any, index: number) => 
  `${index + 1}. ${repo.name} (${repo.owner})
   - ⭐ ${repo.stars} stars
   - 语言: ${repo.language || '未知'}
   - 描述: ${repo.description || '无描述'}`
).join('\n')}

编程语言分布：
${languageDistribution.map((lang: any) => `- ${lang.language}: ${lang.percentage}%`).join('\n')}

仓库质量分布：
${qualityDistribution.map((quality: any) => `- ${quality.quality}: ${quality.count}个仓库`).join('\n')}

请生成一份包含以下内容的分析报告：
1. 技术趋势概述
2. 主要编程语言特点
3. 优质项目亮点
4. 技术生态分析
5. 学习建议

要求：
- 语言简洁专业
- 突出技术特点
- 提供实用建议
- 字数控制在300-500字`

    // 调用Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // 使用免费的Llama3模型
        messages: [
          {
            role: 'system',
            content: '你是一位专业的技术分析师，擅长分析GitHub仓库数据并提供有价值的技术洞察。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      // 如果API调用失败，返回备用分析
      const fallbackSummary = generateFallbackSummary(data)
      return NextResponse.json({ summary: fallbackSummary })
    }

    const result = await response.json()
    const summary = result.choices[0]?.message?.content || '无法生成AI总结'

    return NextResponse.json({ summary })

  } catch (error) {
    console.error('AI总结生成错误:', error)
    
    // 返回备用分析
    const data = await request.json()
    const fallbackSummary = generateFallbackSummary(data)
    return NextResponse.json({ summary: fallbackSummary })
  }
}

// 备用分析生成函数
function generateFallbackSummary(data: any) {
  const { keyword, totalRepos, topRepos, languageDistribution } = data
  
  const topLanguages = languageDistribution.slice(0, 3)
  const topRepo = topRepos[0]
  
  return `📊 ${keyword} 技术生态分析报告

🔍 概览
共发现 ${totalRepos} 个相关仓库，显示了 ${keyword} 在开源社区的活跃度。

💻 主要技术栈
${topLanguages.map((lang: any) => `• ${lang.language}: ${lang.percentage}%`).join('\n')}

⭐ 明星项目
${topRepo.name} (${topRepo.stars} stars) 是该领域的代表性项目，使用 ${topRepo.language} 开发。

🎯 技术特点
• 多语言生态：支持 ${languageDistribution.length} 种编程语言
• 社区活跃：拥有丰富的开源项目资源
• 应用广泛：涵盖多个技术领域和应用场景

💡 学习建议
1. 从明星项目开始学习，了解最佳实践
2. 关注主流语言实现，掌握核心技术
3. 参与开源贡献，提升实战经验

注：本分析基于GitHub公开数据生成，建议结合具体需求深入研究。`
}
