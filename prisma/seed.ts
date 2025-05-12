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
      console.log('数据库为空，运行爬虫脚本获取初始数据...');
      // 这里可以选择直接调用爬虫脚本
      // 注意：在实际部署时，可能需要调整路径
      try {
        execSync('python ../scraper/main.py', { stdio: 'inherit' });
        console.log('爬虫脚本执行完成');
      } catch (error) {
        console.error('爬虫脚本执行失败:', error);
        console.log('请手动运行爬虫脚本获取初始数据');
      }
    }
    
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