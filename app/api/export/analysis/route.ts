import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// 导出分析数据为JSON
export async function GET(request: Request) {
  try {
    // 获取请求参数
    const { searchParams } = new URL(request.url);
    const keywordText = searchParams.get('keyword');
    const includeFiles = searchParams.get('includeFiles') === 'true'; // 是否包含文件详情
    const library = searchParams.get('library'); // 特定库名称
    const exportAll = searchParams.get('all') === 'true'; // 是否导出所有关键词
    
    // 如果是导出所有关键词
    if (exportAll) {
      // 获取所有关键词
      const keywords = await prisma.keyword.findMany({
        where: {
          repositories: {
            some: {} // 只获取有关联仓库的关键词
          }
        },
        orderBy: {
          text: 'asc'
        },
        include: {
          _count: {
            select: {
              repositories: true,
              crawlTasks: true
            }
          }
        }
      });
      
      if (keywords.length === 0) {
        return NextResponse.json(
          { error: '没有找到任何关键词' },
          { status: 404 }
        );
      }
      
      // 为每个关键词准备分析数据
      const allAnalysisData = [];
      
      for (const keyword of keywords) {
        // 获取关键词的最新爬虫任务
        const latestTask = await prisma.crawlTask.findFirst({
          where: {
            keywordId: keyword.id
          },
          orderBy: {
            started_at: 'desc'
          }
        });
        
        // 构建查询条件
        const whereCondition: any = {
          repository: {
            keywords: {
              some: {
                keywordId: keyword.id
              }
            }
          }
        };
        
        // 如果指定了特定库，则只查询使用该库的文件
        if (library) {
          whereCondition.importedLibraries = {
            has: library
          };
        }
        
        // 查询该关键词的所有代码文件
        const codeFiles = await prisma.codeFile.findMany({
          where: whereCondition,
          select: {
            importedLibraries: true,
            repository: {
              select: {
                id: true,
                name: true,
                owner: true,
                language: true
              }
            }
          },
          take: library ? 500 : undefined // 如果指定了库，限制返回文件数量
        });
        
        // 统计库使用情况
        const libraryUsage: Record<string, number> = {};
        const libraryByLanguage: Record<string, Record<string, number>> = {};
        
        codeFiles.forEach(file => {
          const repoLanguage = file.repository.language || 'unknown';
          
          // 初始化语言条目
          if (!libraryByLanguage[repoLanguage]) {
            libraryByLanguage[repoLanguage] = {};
          }
          
          // 统计库使用情况
          file.importedLibraries.forEach(lib => {
            // 总体统计
            libraryUsage[lib] = (libraryUsage[lib] || 0) + 1;
            
            // 按语言统计
            libraryByLanguage[repoLanguage][lib] = 
              (libraryByLanguage[repoLanguage][lib] || 0) + 1;
          });
        });
        
        // 对库使用情况进行排序
        const sortedLibraries = Object.entries(libraryUsage)
          .sort(([, countA], [, countB]) => countB - countA)
          .map(([name, count]) => ({ name, count }));
        
        // 获取语言分布
        const languageDistribution: Record<string, number> = {};
        
        Object.keys(libraryByLanguage).forEach(lang => {
          const librariesCount = Object.keys(libraryByLanguage[lang]).length;
          if (librariesCount > 0) {
            languageDistribution[lang] = librariesCount;
          }
        });
        
        // 准备导出数据
        const analysisData: any = {
          keyword: keyword.text,
          repository_count: keyword._count.repositories,
          analysis_date: new Date().toISOString(),
          charts: {
            language_distribution: {
              data: languageDistribution
            },
            stars_distribution: {
              data: {
                mean: 0,
                min: 0,
                max: 0,
                total: 0
              }
            },
            imported_libraries: {
              data: sortedLibraries.reduce((acc, lib) => {
                acc[lib.name] = lib.count;
                return acc;
              }, {} as Record<string, number>)
            },
            common_packages: {
              data: {}
            },
            common_functions: {
              data: {}
            },
            tag_analysis: {
              data: {}
            },
            comment_keywords: {
              data: {}
            }
          }
        };
        
        allAnalysisData.push(analysisData);
      }
      
      // 将数据转换为JSON字符串
      const jsonData = JSON.stringify(allAnalysisData, null, 2);
      
      // 设置响应头，使浏览器将响应作为文件下载
      const headers = new Headers();
      headers.append('Content-Type', 'application/json; charset=utf-8');
      headers.append('Content-Disposition', `attachment; filename=all_keywords_analysis${library ? '_' + library : ''}.json`);
      
      return new NextResponse(jsonData, {
        status: 200,
        headers
      });
    }
    
    // 以下是原有的单个关键词导出逻辑
    if (!keywordText) {
      return NextResponse.json(
        { error: '关键词参数不能为空' },
        { status: 400 }
      );
    }
    
    // 获取关键词信息
    const keyword = await prisma.keyword.findUnique({
      where: {
        text: keywordText
      },
      include: {
        _count: {
          select: {
            repositories: true,
            crawlTasks: true
          }
        }
      }
    });
    
    if (!keyword) {
      return NextResponse.json(
        { error: '未找到指定关键词' },
        { status: 404 }
      );
    }
    
    // 获取关键词的最新爬虫任务
    const latestTask = await prisma.crawlTask.findFirst({
      where: {
        keywordId: keyword.id
      },
      orderBy: {
        started_at: 'desc'
      }
    });
    
    // 构建查询条件
    const whereCondition: any = {
      repository: {
        keywords: {
          some: {
            keywordId: keyword.id
          }
        }
      }
    };
    
    // 如果指定了特定库，则只查询使用该库的文件
    if (library) {
      whereCondition.importedLibraries = {
        has: library
      };
    }
    
    // 查询该关键词的所有代码文件
    const codeFiles = await prisma.codeFile.findMany({
      where: whereCondition,
      select: {
        id: includeFiles,
        filename: includeFiles,
        path: includeFiles,
        importedLibraries: true,
        functions: includeFiles ? true : undefined,
        components: includeFiles ? true : undefined,
        apiEndpoints: includeFiles ? true : undefined,
        repository: {
          select: {
            id: true,
            name: true,
            owner: true,
            language: true,
            stars: includeFiles,
            url: includeFiles
          }
        }
      },
      take: library ? 500 : undefined // 如果指定了库，限制返回文件数量
    });
    
    // 统计库使用情况
    const libraryUsage: Record<string, number> = {};
    const libraryByLanguage: Record<string, Record<string, number>> = {};
    
    // 如果需要包含文件详情，则保存文件信息
    let libraryFiles: Record<string, any[]> = {};
    
    codeFiles.forEach(file => {
      const repoLanguage = file.repository.language || 'unknown';
      
      // 初始化语言条目
      if (!libraryByLanguage[repoLanguage]) {
        libraryByLanguage[repoLanguage] = {};
      }
      
      // 统计库使用情况
      file.importedLibraries.forEach(lib => {
        // 总体统计
        libraryUsage[lib] = (libraryUsage[lib] || 0) + 1;
        
        // 按语言统计
        libraryByLanguage[repoLanguage][lib] = 
          (libraryByLanguage[repoLanguage][lib] || 0) + 1;
        
        // 如果需要包含文件详情，保存文件信息
        if (includeFiles && (!library || library === lib)) {
          if (!libraryFiles[lib]) {
            libraryFiles[lib] = [];
          }
          
          libraryFiles[lib].push({
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
            // 其他可能有用的信息
            functions: file.functions?.length || 0,
            components: file.components?.length || 0,
            apiEndpoints: file.apiEndpoints?.length || 0
          });
        }
      });
    });
    
    // 对库使用情况进行排序
    const sortedLibraries = Object.entries(libraryUsage)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([name, count]) => ({ name, count }));
    
    // 获取语言分布
    const languageDistribution: Record<string, number> = {};
    
    Object.keys(libraryByLanguage).forEach(lang => {
      const librariesCount = Object.keys(libraryByLanguage[lang]).length;
      if (librariesCount > 0) {
        languageDistribution[lang] = librariesCount;
      }
    });
    
    // 准备导出数据
    const analysisData: any = {
      keyword: keywordText,
      repository_count: keyword._count.repositories,
      analysis_date: new Date().toISOString(),
      charts: {
        language_distribution: {
          data: languageDistribution
        },
        stars_distribution: {
          data: {
            mean: 0,
            min: 0,
            max: 0,
            total: 0
          }
        },
        imported_libraries: {
          data: sortedLibraries.reduce((acc, lib) => {
            acc[lib.name] = lib.count;
            return acc;
          }, {} as Record<string, number>)
        },
        common_packages: {
          data: {}
        },
        common_functions: {
          data: {}
        },
        tag_analysis: {
          data: {}
        },
        comment_keywords: {
          data: {}
        }
      }
    };
    
    // 如果需要包含文件详情，添加库文件列表
    if (includeFiles) {
      if (library) {
        // 如果指定了特定库，只包含该库的文件
        analysisData.library_files = {
          [library]: libraryFiles[library] || []
        };
      } else {
        // 包含所有库的文件列表
        analysisData.library_files = libraryFiles;
      }
    }
    
    // 将数据转换为JSON字符串
    const jsonData = JSON.stringify(analysisData, null, 2);
    
    // 设置响应头，使浏览器将响应作为文件下载
    const headers = new Headers();
    headers.append('Content-Type', 'application/json; charset=utf-8');
    headers.append('Content-Disposition', `attachment; filename=analysis_${keywordText}${library ? '_' + library : ''}.json`);
    
    return new NextResponse(jsonData, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('导出分析数据失败:', error);
    return NextResponse.json(
      { error: '导出分析数据失败' },
      { status: 500 }
    );
  }
} 