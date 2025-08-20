import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');
  
  try {
    // 确保数据库表已创建
    console.log('运行数据库迁移...');
    execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
    
    // 检查是否已有数据
    const repoCount = await prisma.repository.count();
    console.log(`当前数据库中有 ${repoCount} 个仓库记录`);
    
    if (repoCount === 0) {
      console.log('数据库为空，创建初始关键词数据...');
      
      // 创建初始关键词
      const initialKeywords = [
        { name: 'react', category: 'frontend' },
        { name: 'vue', category: 'frontend' },
        { name: 'angular', category: 'frontend' },
        { name: 'nodejs', category: 'backend' },
        { name: 'python', category: 'backend' },
        { name: 'javascript', category: 'language' },
        { name: 'typescript', category: 'language' },
        { name: 'machine-learning', category: 'ai' },
        { name: 'artificial-intelligence', category: 'ai' },
        { name: 'docker', category: 'devops' },
        { name: 'kubernetes', category: 'devops' },
        { name: 'microservices', category: 'architecture' },
      ];
      
      for (const keyword of initialKeywords) {
        await prisma.keyword.upsert({
          where: { name: keyword.name },
          update: {},
          create: keyword,
        });
      }
      
      console.log(`创建了 ${initialKeywords.length} 个初始关键词`);
      
      console.log('运行爬虫脚本获取初始数据...');
      // 注意：路径已更新为新的 backend 结构
      try {
        execSync('python backend/scraper/main.py', { stdio: 'inherit' });
        console.log('爬虫脚本执行完成');
      } catch (error) {
        console.error('爬虫脚本执行失败:', error);
        console.log('请手动运行爬虫脚本获取初始数据');
        console.log('命令: cd backend && python scraper/main.py');
      }
    }
    
    // 显示最终统计
    const finalStats = {
      repositories: await prisma.repository.count(),
      keywords: await prisma.keyword.count(),
      crawlTasks: await prisma.crawlTask.count(),
      importedLibraries: await prisma.importedLibrary.count(),
    };
    
    console.log('数据库统计:');
    console.log(`- 仓库: ${finalStats.repositories}`);
    console.log(`- 关键词: ${finalStats.keywords}`);
    console.log(`- 爬取任务: ${finalStats.crawlTasks}`);
    console.log(`- 导入库: ${finalStats.importedLibraries}`);
    
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
