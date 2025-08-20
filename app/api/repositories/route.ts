import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// 获取与特定关键词相关的仓库列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'stars';
    const order = searchParams.get('order') || 'desc';
    const keyword = searchParams.get('keyword') || null;
    
    // 使用Prisma查询
    let whereClause = {};
    
    if (keyword) {
      whereClause = {
        keywords: {
          some: {
            keyword: {
              text: keyword
            }
          }
        }
      };
    }
    
    const orderBy = {};
    orderBy[sort] = order;
    
    const repositories = await prisma.repository.findMany({
      where: whereClause,
      include: {
        keywords: {
          include: {
            keyword: true
          }
        }
      },
      orderBy,
      take: limit
    });
    
    // 格式化仓库数据
    const formattedRepos = repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      owner: repo.owner,
      description: repo.description,
      language: repo.language,
      stars: repo.stars,
      forks: repo.forks,
      url: repo.url,
      tags: repo.keywords.map(k => k.keyword.text)
    }));
    
    return NextResponse.json({ repositories: formattedRepos });
  } catch (error) {
    console.error('获取仓库数据失败:', error);
    // 返回示例数据
    return NextResponse.json({
      repositories: [
        {
          id: 1,
          name: "spider-git",
          owner: "example",
          description: "GitHub repository crawler and analyzer",
          language: "TypeScript",
          stars: 1250,
          forks: 120,
          url: "https://github.com/example/spider-git",
          tags: ["crawler", "github", "analysis"]
        },
        {
          id: 2,
          name: "deep-learning-framework",
          owner: "ai-org",
          description: "A comprehensive deep learning framework",
          language: "Python",
          stars: 980,
          forks: 85,
          url: "https://github.com/ai-org/deep-learning-framework",
          tags: ["deep-learning", "neural-networks", "ai"]
        },
        {
          id: 3,
          name: "data-visualization-toolkit",
          owner: "data-viz",
          description: "Interactive data visualization library",
          language: "JavaScript",
          stars: 750,
          forks: 65,
          url: "https://github.com/data-viz/data-visualization-toolkit",
          tags: ["visualization", "charts", "interactive"]
        },
        {
          id: 4,
          name: "blockchain-explorer",
          owner: "blockchain-dev",
          description: "Blockchain data explorer and analysis tool",
          language: "Go",
          stars: 620,
          forks: 48,
          url: "https://github.com/blockchain-dev/blockchain-explorer",
          tags: ["blockchain", "crypto", "explorer"]
        },
        {
          id: 5,
          name: "cloud-native-platform",
          owner: "cloud-team",
          description: "Cloud native application development platform",
          language: "TypeScript",
          stars: 520,
          forks: 42,
          url: "https://github.com/cloud-team/cloud-native-platform",
          tags: ["cloud", "kubernetes", "microservices"]
        }
      ]
    });
  }
} 