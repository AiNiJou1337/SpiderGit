import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  try {
    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword'); // 关键词
    const library = searchParams.get('library'); // 库/包名称
    const language = searchParams.get('language'); // 可选的语言筛选
    const limit = parseInt(searchParams.get('limit') || '50', 10); // 默认返回50个文件
    const page = parseInt(searchParams.get('page') || '1', 10);
    
    if (!keyword) {
      return NextResponse.json(
        { error: '关键词参数不能为空' },
        { status: 400 }
      );
    }
    
    if (!library) {
      return NextResponse.json(
        { error: '库/包名称参数不能为空' },
        { status: 400 }
      );
    }
    
    // 获取关键词ID - 尝试多种匹配方式
    let keywordRecord = await prisma.keyword.findUnique({
      where: {
        text: keyword
      }
    });

    // 如果直接匹配失败，尝试其他格式
    if (!keywordRecord) {
      // 尝试下划线格式
      const keywordUnderscore = keyword.replace(/ /g, '_');
      keywordRecord = await prisma.keyword.findUnique({
        where: {
          text: keywordUnderscore
        }
      });
    }

    // 如果还是找不到，尝试模糊匹配
    if (!keywordRecord) {
      const keywordRecords = await prisma.keyword.findMany({
        where: {
          OR: [
            { text: { contains: keyword, mode: 'insensitive' } },
            { text: { contains: keyword.replace(/ /g, '_'), mode: 'insensitive' } },
            { text: { contains: keyword.replace(/_/g, ' '), mode: 'insensitive' } }
          ]
        },
        take: 1
      });

      if (keywordRecords.length > 0) {
        keywordRecord = keywordRecords[0];
      }
    }

    if (!keywordRecord) {
      return NextResponse.json(
        { error: `未找到指定关键词: ${keyword}` },
        { status: 404 }
      );
    }
    
    // 构建查询条件
    const whereCondition: any = {
      repository: {
        keywords: {
          some: {
            keywordId: keywordRecord.id
          }
        }
      },
      importedLibraries: {
        has: library
      }
    };
    
    // 添加语言过滤条件（如果提供）
    if (language && language !== 'all') {
      whereCondition.repository.language = language;
    }
    
    // 获取总数
    const totalFiles = await prisma.codeFile.count({
      where: whereCondition
    });
    
    // 查询使用该库的代码文件
    const codeFiles = await prisma.codeFile.findMany({
      where: whereCondition,
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            owner: true,
            language: true,
            stars: true,
            url: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        created_at: 'desc'
      }
    });
    
    // 格式化文件数据
    const formattedFiles = codeFiles.map(file => ({
      id: file.id,
      filename: file.filename,
      path: file.path,
      repository: {
        id: file.repository.id,
        name: file.repository.name,
        owner: file.repository.owner,
        fullName: `${file.repository.owner}/${file.repository.name}`,
        language: file.repository.language,
        stars: file.repository.stars,
        url: file.repository.url || `https://github.com/${file.repository.owner}/${file.repository.name}`
      },
      // 加入其他可能有用的信息
      functions: file.functions?.length || 0,
      components: file.components?.length || 0,
      apiEndpoints: file.apiEndpoints?.length || 0,
      allImportedLibraries: file.importedLibraries
    }));
    
    return NextResponse.json({
      keyword,
      library,
      language: language || 'all',
      totalFiles,
      page,
      limit,
      totalPages: Math.ceil(totalFiles / limit),
      files: formattedFiles
    });
    
  } catch (error) {
    console.error('获取库文件列表失败:', error);
    return NextResponse.json(
      { error: '获取库文件列表失败' },
      { status: 500 }
    );
  }
} 