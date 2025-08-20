import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  try {
    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const language = searchParams.get('language'); // 可选的语言筛选
    const limit = parseInt(searchParams.get('limit') || '15', 10); // 默认返回15个最常用的库
    
    if (!keyword) {
      return NextResponse.json(
        { error: '关键词参数不能为空' },
        { status: 400 }
      );
    }
    
    // 获取关键词ID
    const keywordRecord = await prisma.keyword.findUnique({
      where: {
        text: keyword
      }
    });
    
    if (!keywordRecord) {
      return NextResponse.json(
        { error: '未找到指定关键词' },
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
      }
    };
    
    // 添加语言过滤条件（如果提供）
    if (language && language !== 'all') {
      whereCondition.repository.language = language;
    }
    
    // 查询所有代码文件
    const codeFiles = await prisma.codeFile.findMany({
      where: whereCondition,
      select: {
        importedLibraries: true,
        repository: {
          select: {
            language: true
          }
        }
      }
    });
    
    // 按语言分类的库使用统计
    const librariesByLanguage: Record<string, Record<string, number>> = {};
    
    // 总体库使用统计
    const allLibraries: Record<string, number> = {};
    
    // 处理每个代码文件的库引用
    codeFiles.forEach(file => {
      const repoLanguage = file.repository.language || 'unknown';
      
      // 初始化语言条目
      if (!librariesByLanguage[repoLanguage]) {
        librariesByLanguage[repoLanguage] = {};
      }
      
      // 统计库使用情况
      file.importedLibraries.forEach(library => {
        // 按语言统计
        librariesByLanguage[repoLanguage][library] = 
          (librariesByLanguage[repoLanguage][library] || 0) + 1;
          
        // 总体统计
        allLibraries[library] = (allLibraries[library] || 0) + 1;
      });
    });
    
    // 对每种语言的库进行排序，并只保留前N个
    const topLibrariesByLanguage: Record<string, Record<string, number>> = {};
    
    Object.entries(librariesByLanguage).forEach(([lang, libraries]) => {
      const sortedLibraries = Object.entries(libraries)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, limit)
        .reduce((acc, [lib, count]) => {
          acc[lib] = count;
          return acc;
        }, {} as Record<string, number>);
        
      topLibrariesByLanguage[lang] = sortedLibraries;
    });
    
    // 对总体库使用情况进行排序，并只保留前N个
    const topLibraries = Object.entries(allLibraries)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, limit)
      .reduce((acc, [lib, count]) => {
        acc[lib] = count;
        return acc;
      }, {} as Record<string, number>);
      
    // 获取所有可用语言
    const availableLanguages = Object.keys(librariesByLanguage).filter(lang => 
      Object.keys(librariesByLanguage[lang]).length > 0
    );
    
    return NextResponse.json({
      keyword,
      totalFiles: codeFiles.length,
      availableLanguages,
      libraries: topLibraries,
      librariesByLanguage: topLibrariesByLanguage
    });
    
  } catch (error) {
    console.error('获取库分析数据失败:', error);
    return NextResponse.json(
      { error: '获取库分析数据失败' },
      { status: 500 }
    );
  }
} 