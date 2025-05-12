/**
 * 数据库初始化脚本
 * 用于初始化数据库并运行爬虫获取初始数据
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

console.log('开始初始化数据库和爬虫环境...');

// 检查环境变量
if (!process.env.DATABASE_URL) {
  console.error('错误: 未找到数据库连接URL，请确保.env文件中包含DATABASE_URL');
  process.exit(1);
}

try {
  // 运行Prisma迁移
  console.log('\n1. 运行数据库迁移...');
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
  console.log('✅ 数据库迁移完成');
  
  // 生成Prisma客户端
  console.log('\n2. 生成Prisma客户端...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma客户端生成完成');
  
  // 检查Python环境
  console.log('\n3. 检查Python环境...');
  try {
    execSync('python --version', { stdio: 'inherit' });
    console.log('✅ Python已安装');
  } catch (error) {
    console.error('❌ Python未安装或不在PATH中，请安装Python 3.x');
    process.exit(1);
  }
  
  // 安装Python依赖
  console.log('\n4. 安装Python爬虫依赖...');
  const scraperDir = path.join(__dirname, '..', 'scraper');
  execSync(`pip install -r ${path.join(scraperDir, 'requirements.txt')}`, { stdio: 'inherit' });
  console.log('✅ Python依赖安装完成');
  
  // 运行爬虫获取初始数据
  console.log('\n5. 运行爬虫获取初始数据...');
  execSync(`python ${path.join(scraperDir, 'main.py')}`, { stdio: 'inherit' });
  console.log('✅ 初始数据获取完成');
  
  console.log('\n✅✅✅ 数据库和爬虫环境初始化完成！');
  console.log('现在可以运行 npm run dev 启动应用');
} catch (error) {
  console.error('初始化过程中出错:', error);
  process.exit(1);
}