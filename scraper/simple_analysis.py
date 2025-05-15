#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
简单分析脚本 - 为指定关键词生成分析文件
"""

import os
import json
import logging
import traceback
import psycopg2

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('simple_analysis')

# 分析结果保存目录
ANALYTICS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'analytics')

# 数据库连接信息
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'github_trending',
    'user': 'postgres',
    'password': 'postgres'
}

# 在这里直接指定要分析的关键词
KEYWORDS = [
    "Application API",
    # 可以添加其他关键词
]

def get_db_connection():
    """获取数据库连接"""
    try:
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            dbname=DB_CONFIG['database'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
        conn.autocommit = True
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        raise

def get_repositories_for_keyword(conn, keyword):
    """获取特定关键词的所有仓库数据"""
    try:
        with conn.cursor() as cursor:
            # 获取关键词ID
            cursor.execute('SELECT id FROM "keywords" WHERE "text" = %s', (keyword,))
            keyword_record = cursor.fetchone()
            
            if not keyword_record:
                logger.error(f"未找到关键词: {keyword}")
                return None
                
            keyword_id = keyword_record[0]
            
            # 获取与该关键词相关的仓库
            cursor.execute('''
                SELECT r.id, r.name, r.owner, r.full_name, r.description, r.language, 
                       r.stars, r.forks, r.url, r.tags
                FROM "repositories" r
                JOIN "repository_keywords" rk ON r.id = rk."repositoryId"
                WHERE rk."keywordId" = %s
                ORDER BY r.stars DESC
            ''', (keyword_id,))
            
            repositories = []
            for row in cursor.fetchall():
                repo = {
                    'id': row[0],
                    'name': row[1],
                    'owner': row[2],
                    'full_name': row[3],
                    'description': row[4],
                    'language': row[5],
                    'stars': row[6],
                    'forks': row[7],
                    'url': row[8],
                    'tags': row[9] if row[9] else []
                }
                repositories.append(repo)
            
            return {'repositories': repositories, 'keyword': keyword}
    except Exception as e:
        logger.error(f"获取仓库数据失败: {e}")
        return None

def generate_and_save_analysis(data, output_dir, keyword):
    """生成简单的分析结果并保存为JSON"""
    try:
        # 确保目录存在
        os.makedirs(output_dir, exist_ok=True)
        
        repositories = data['repositories']
        
        # 文件名安全处理
        safe_keyword = keyword.replace(' ', '_').replace('/', '_').replace('\\', '_')
        
        # 简单统计语言分布
        languages = {}
        for repo in repositories:
            if repo['language']:
                lang = repo['language']
                languages[lang] = languages.get(lang, 0) + 1
        
        # 整合分析结果
        analysis_result = {
            'keyword': keyword,
            'repository_count': len(repositories),
            'analysis_date': str(os.path.getctime(__file__)),  # 使用创建时间作为分析日期
            'charts': {
                'language_distribution': {
                    'data': languages
                },
                'stars_distribution': {
                    'data': {
                        'min': min([r['stars'] for r in repositories]) if repositories else 0,
                        'max': max([r['stars'] for r in repositories]) if repositories else 0,
                        'mean': sum([r['stars'] for r in repositories]) / len(repositories) if repositories else 0
                    }
                }
            }
        }
        
        # 保存分析结果到JSON文件
        result_file = os.path.join(output_dir, f'analysis_{safe_keyword}.json')
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(analysis_result, f, ensure_ascii=False, indent=2)
        
        logger.info(f"分析结果已保存到 {result_file}")
        return analysis_result
    
    except Exception as e:
        logger.error(f"生成分析结果失败: {e}")
        logger.error(traceback.format_exc())
        return None

def main():
    # 连接数据库
    conn = None
    try:
        # 确保分析结果目录存在
        os.makedirs(ANALYTICS_DIR, exist_ok=True)
        logger.info(f"分析结果将保存到: {os.path.abspath(ANALYTICS_DIR)}")
        
        # 连接数据库
        conn = get_db_connection()
        
        for keyword in KEYWORDS:
            logger.info(f"开始分析关键词: {keyword}")
            
            # 获取该关键词的仓库数据
            data = get_repositories_for_keyword(conn, keyword)
            
            if not data or not data['repositories']:
                logger.warning(f"没有找到关键词 '{keyword}' 的仓库数据，请确保已爬取该关键词的项目")
                continue
            
            logger.info(f"找到 {len(data['repositories'])} 个与关键词 '{keyword}' 相关的仓库")
            
            # 生成分析结果
            logger.info("开始生成分析结果...")
            result = generate_and_save_analysis(data, ANALYTICS_DIR, keyword)
            
            if result:
                logger.info(f"分析完成！结果已保存至 {ANALYTICS_DIR}")
                # 打印结果文件的完整路径
                safe_keyword = keyword.replace(' ', '_').replace('/', '_').replace('\\', '_')
                result_file = os.path.join(ANALYTICS_DIR, f'analysis_{safe_keyword}.json')
                logger.info(f"结果文件路径: {os.path.abspath(result_file)}")
            else:
                logger.error("分析失败，未生成结果")
    
    except Exception as e:
        logger.error(f"分析过程出错: {e}")
        logger.error(traceback.format_exc())
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main() 