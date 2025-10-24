#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
分析现有仓库的代码
用于修复已爬取但未分析代码的关键词
"""

import os
import sys
import asyncio
import argparse
import logging
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.scraper.crawlers.keyword_scraper import KeywordScraper

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def analyze_keyword_repos(keyword: str, limit: int = 50):
    """分析指定关键词的仓库代码"""
    try:
        import psycopg2
        from dotenv import load_dotenv
        
        # 加载环境变量
        env_path = project_root / '.env'
        load_dotenv(env_path)
        
        DB_URL = os.getenv('DATABASE_URL')
        if not DB_URL:
            logger.error("未找到DATABASE_URL环境变量")
            return
        
        # 连接数据库
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        # 查找关键词
        cursor.execute('SELECT id FROM keywords WHERE text = %s', (keyword,))
        keyword_record = cursor.fetchone()
        
        if not keyword_record:
            logger.error(f"未找到关键词: {keyword}")
            return
        
        keyword_id = keyword_record[0]
        
        # 获取该关键词的仓库（按星标排序，获取前N个）
        cursor.execute('''
            SELECT r.id, r.full_name, r.owner, r.name, r.language, r.stars
            FROM repositories r
            JOIN repository_keywords rk ON r.id = rk."repositoryId"
            WHERE rk."keywordId" = %s
            ORDER BY r.stars DESC
            LIMIT %s
        ''', (keyword_id, limit))
        
        repos = cursor.fetchall()
        logger.info(f"找到 {len(repos)} 个仓库需要分析")
        
        if not repos:
            logger.warning(f"关键词 '{keyword}' 没有关联的仓库")
            cursor.close()
            conn.close()
            return
        
        # 初始化爬虫
        scraper = KeywordScraper()
        
        # 分析每个仓库
        for i, (repo_id, full_name, owner, name, language, stars) in enumerate(repos):
            try:
                logger.info(f"\n{'='*60}")
                logger.info(f"[{i+1}/{len(repos)}] 分析仓库: {full_name}")
                logger.info(f"语言: {language}, 星标: {stars}")
                logger.info(f"{'='*60}")
                
                # 构建仓库数据
                repo_data = {
                    'full_name': full_name,
                    'owner': owner,
                    'name': name,
                    'language': language,
                    'stars': stars
                }
                
                # 分析代码
                code_analysis = await scraper.analyze_repository_code(repo_data)
                
                if code_analysis and code_analysis.get('file_analysis'):
                    # 保存到数据库
                    scraper._save_code_analysis_to_db(repo_data, code_analysis)
                    logger.info(f"✅ 成功分析 {full_name}，找到 {len(code_analysis['file_analysis'])} 个文件")
                else:
                    logger.warning(f"⚠️ {full_name} 未找到代码文件")
                
                # 每5个仓库休息一下
                if (i + 1) % 5 == 0:
                    logger.info(f"已分析 {i+1} 个仓库，休息3秒...")
                    await asyncio.sleep(3)
                    
            except Exception as e:
                logger.error(f"❌ 分析 {full_name} 失败: {e}")
                continue
        
        cursor.close()
        conn.close()
        logger.info(f"\n{'='*60}")
        logger.info(f"✅ 完成！共分析 {len(repos)} 个仓库")
        logger.info(f"{'='*60}")
        
    except Exception as e:
        logger.error(f"分析过程出错: {e}")
        import traceback
        logger.error(traceback.format_exc())

def main():
    parser = argparse.ArgumentParser(description='分析现有仓库的代码')
    parser.add_argument('keyword', help='关键词')
    parser.add_argument('--limit', type=int, default=50, help='分析仓库数量限制（默认50）')
    
    args = parser.parse_args()
    
    logger.info(f"开始分析关键词 '{args.keyword}' 的仓库代码")
    logger.info(f"将分析前 {args.limit} 个仓库（按星标排序）")
    
    asyncio.run(analyze_keyword_repos(args.keyword, args.limit))

if __name__ == "__main__":
    main()


