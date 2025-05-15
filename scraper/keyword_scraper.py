#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import time
import json
import random
import argparse
import requests
import psycopg2
import datetime
import traceback
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
from pathlib import Path
import re
import logging

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('keyword_scraper')

# 数据库连接信息
DB_URL = os.environ.get('DATABASE_URL')
if not DB_URL:
    # 从.env文件读取
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    DB_URL = line.split('=', 1)[1].strip()
                    break

if not DB_URL:
    logger.error("未找到数据库连接字符串，请确保设置了DATABASE_URL环境变量或.env文件")
    sys.exit(1)

# 常量
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
}

# GitHub搜索API
GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories?q={query}&sort=stars&order=desc&per_page=100'
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')

if GITHUB_TOKEN:
    HEADERS['Authorization'] = f'token {GITHUB_TOKEN}'

# 爬取时的延迟（秒）
REQUEST_DELAY = 2

# 数据库连接
def get_db_connection():
    try:
        return psycopg2.connect(DB_URL)
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        raise

# 更新任务状态
def update_task_status(conn, task_id, status, progress, message=None, python_repos=None, java_repos=None, total_repos=None):
    if not task_id:
        return
        
    try:
        with conn.cursor() as cursor:
            update_data = {
                'status': status,
                'progress': progress,
                'message': message
            }
            
            # 添加可选字段
            if python_repos is not None:
                update_data['python_repositories'] = python_repos
            if java_repos is not None:
                update_data['java_repositories'] = java_repos
            if total_repos is not None:
                update_data['total_repositories'] = total_repos
                
            # 如果任务完成或失败，设置完成时间
            if status in ('completed', 'failed'):
                update_data['completed_at'] = datetime.datetime.now()
                
            # 构建SQL语句
            set_clause = ', '.join([f'"{k}" = %s' for k in update_data.keys()])
            values = list(update_data.values())
            
            sql = f'UPDATE "crawl_tasks" SET {set_clause} WHERE id = %s'
            values.append(task_id)
            
            cursor.execute(sql, values)
            conn.commit()
            logger.info(f"已更新任务 #{task_id} 状态: {status}, 进度: {progress}%")
    except Exception as e:
        logger.error(f"更新任务状态失败: {e}")
        conn.rollback()

# 获取GitHub认证的API请求函数
def github_api_request(url, params=None):
    headers = HEADERS.copy()
    # 确保请求GitHub API时使用正确的Accept头
    headers['Accept'] = 'application/json'
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        # 实际项目中应检查API速率限制，并处理限制超过情况
        return response.json()
    except Exception as e:
        logger.error(f"GitHub API请求失败: {e}")
        raise

# 根据关键词搜索GitHub仓库
def search_github_repositories(keyword, language=None, min_stars=0, max_results=100):
    # 构建查询参数
    params = {
        "q": keyword,
        "sort": "stars",
        "order": "desc",
        "per_page": 100
    }
    
    # 添加语言过滤
    if language:
        params["q"] += f" language:{language}"
    
    # 添加星标过滤
    if min_stars > 0:
        params["q"] += f" stars:>={min_stars}"
        
    url = "https://api.github.com/search/repositories"
    
    logger.info(f"搜索GitHub仓库: {url} 参数: {params}")
    data = github_api_request(url, params=params)
    
    total_count = data.get('total_count', 0)
    items = data.get('items', [])
    
    logger.info(f"找到 {total_count} 个结果，返回 {len(items)} 个仓库")
    
    # 限制最大结果数
    return items[:max_results]

# 将仓库数据保存到数据库
def save_repository(conn, repo_data, keyword_id, task_id=None):
    try:
        with conn.cursor() as cursor:
            # 检查repository_keywords表的结构
            try:
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'repository_keywords'
                """)
                columns = [col[0] for col in cursor.fetchall()]
                logger.info(f"repository_keywords表列名: {columns}")
            except Exception as e:
                logger.error(f"无法获取表结构: {e}")
            
            # 检查仓库是否已存在
            cursor.execute('SELECT id FROM "repositories" WHERE "full_name" = %s', (repo_data['full_name'],))
            existing_repo = cursor.fetchone()
            
            if existing_repo:
                repo_id = existing_repo[0]
                logger.info(f"仓库已存在，ID: {repo_id}, 名称: {repo_data['full_name']}")
                
                # 检查关键词关联是否存在
                cursor.execute(
                    'SELECT id FROM "repository_keywords" WHERE "repositoryId" = %s AND "keywordId" = %s',
                    (repo_id, keyword_id)
                )
                if not cursor.fetchone():
                    # 创建关联
                    cursor.execute(
                        'INSERT INTO "repository_keywords" ("repositoryId", "keywordId", "created_at") VALUES (%s, %s, %s)',
                        (repo_id, keyword_id, datetime.datetime.now())
                    )
                    logger.info(f"为仓库 {repo_data['full_name']} 添加了关键词 ID: {keyword_id}")
            else:
                # 插入新仓库
                cursor.execute('''
                    INSERT INTO "repositories" (
                        "name", "owner", "full_name", "description", "language", 
                        "stars", "forks", "url", "created_at", "updated_at", 
                        "trending", "trend_date", "trend_period", "tags", "last_updated"
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
                ''', (
                    repo_data['name'],
                    repo_data['owner'],
                    repo_data['full_name'],
                    repo_data.get('description', ''),
                    repo_data.get('language'),
                    repo_data.get('stars', 0),
                    repo_data.get('forks', 0),
                    repo_data['html_url'],
                    datetime.datetime.now(),
                    datetime.datetime.now(),
                    False,  # 不是trending的
                    datetime.datetime.now(),
                    'keyword',  # 关键词搜索特有period
                    repo_data.get('topics', []),  # 标签
                    datetime.datetime.now()
                ))
                
                repo_id = cursor.fetchone()[0]
                logger.info(f"新增仓库 ID: {repo_id}, 名称: {repo_data['full_name']}")
                
                # 创建关联
                cursor.execute(
                    'INSERT INTO "repository_keywords" ("repositoryId", "keywordId", "created_at") VALUES (%s, %s, %s)',
                    (repo_id, keyword_id, datetime.datetime.now())
                )
                
            conn.commit()
            return repo_id
    except Exception as e:
        logger.error(f"保存仓库失败: {e}")
        conn.rollback()
        return None

# 格式化GitHub API返回的仓库数据
def format_repository_data(item):
    return {
        'name': item['name'],
        'owner': item['owner']['login'],
        'full_name': item['full_name'],
        'description': item.get('description', ''),
        'language': item.get('language'),
        'stars': item.get('stargazers_count', 0),
        'forks': item.get('forks_count', 0),
        'html_url': item['html_url'],
        'topics': item.get('topics', [])
    }

# 按关键词爬取GitHub仓库
def crawl_by_keyword(keyword, conn, task_id=None):
    try:
        # 获取关键词ID
        with conn.cursor() as cursor:
            cursor.execute('SELECT id FROM "keywords" WHERE "text" = %s', (keyword,))
            keyword_record = cursor.fetchone()
            
            if not keyword_record:
                logger.error(f"未找到关键词: {keyword}")
                if task_id:
                    update_task_status(conn, task_id, 'failed', 0, f"未找到关键词: {keyword}")
                return
                
            keyword_id = keyword_record[0]
            
        # 更新任务状态为运行中
        if task_id:
            update_task_status(conn, task_id, 'running', 5, f"开始爬取关键词 '{keyword}' 相关的GitHub仓库")
        
        # Python项目搜索
        logger.info(f"搜索关键词 '{keyword}' 的Python项目")
        python_repos = search_github_repositories(keyword, language="python", max_results=50)
        
        if task_id:
            update_task_status(conn, task_id, 'running', 30, f"找到 {len(python_repos)} 个Python项目，正在处理...", 
                              python_repos=len(python_repos))
        
        # 保存Python项目
        for i, repo in enumerate(python_repos):
            repo_data = format_repository_data(repo)
            save_repository(conn, repo_data, keyword_id, task_id)
            
            # 每5个仓库更新一次进度
            if task_id and i % 5 == 0:
                progress = 30 + int((i / len(python_repos)) * 30)
                update_task_status(conn, task_id, 'running', progress, 
                                 f"已处理 {i+1}/{len(python_repos)} 个Python项目")
            
            # 延迟，避免请求过快
            time.sleep(REQUEST_DELAY)
        
        # Java项目搜索
        logger.info(f"搜索关键词 '{keyword}' 的Java项目")
        java_repos = search_github_repositories(keyword, language="java", max_results=30)
        
        if task_id:
            update_task_status(conn, task_id, 'running', 60, 
                             f"找到 {len(java_repos)} 个Java项目，正在处理...",
                             java_repos=len(java_repos))
        
        # 保存Java项目
        for i, repo in enumerate(java_repos):
            repo_data = format_repository_data(repo)
            save_repository(conn, repo_data, keyword_id, task_id)
            
            # 每5个仓库更新一次进度
            if task_id and i % 5 == 0:
                progress = 60 + int((i / len(java_repos)) * 30)
                update_task_status(conn, task_id, 'running', progress, 
                                 f"已处理 {i+1}/{len(java_repos)} 个Java项目")
            
            # 延迟，避免请求过快
            time.sleep(REQUEST_DELAY)
        
        total_repos = len(python_repos) + len(java_repos)
        
        # 更新任务状态为完成
        if task_id:
            update_task_status(conn, task_id, 'running', 90, 
        f"爬取完成，共处理 {total_repos} 个项目，正在准备分析...",
                             python_repos=len(python_repos),
                             java_repos=len(java_repos),
                             total_repos=total_repos)
        
        logger.info(f"关键词 '{keyword}' 爬取完成，共保存 {total_repos} 个仓库")
    except Exception as e:
        logger.error(f"爬取失败: {e}")
        logger.error(traceback.format_exc())
        
        if task_id:
            update_task_status(conn, task_id, 'failed', 0, f"爬取过程出错: {str(e)[:200]}")

# 主函数
def main():
    parser = argparse.ArgumentParser(description='GitHub关键词爬虫')
    parser.add_argument('--keywords', type=str, required=True, help='要搜索的关键词，多个关键词用逗号分隔')
    parser.add_argument('--task-id', type=int, help='任务ID，用于更新任务状态')
    
    args = parser.parse_args()
    keywords = [k.strip() for k in args.keywords.split(',')]
    task_id = args.task_id
    
    conn = get_db_connection()
    
    try:
        for keyword in keywords:
            logger.info(f"开始爬取关键词: {keyword}")
            crawl_by_keyword(keyword, conn, task_id)
    except Exception as e:
        logger.error(f"未处理的异常: {e}")
        logger.error(traceback.format_exc())
        if task_id:
            update_task_status(conn, task_id, 'failed', 0, f"未处理的异常: {str(e)[:200]}")
    finally:
        conn.close()

if __name__ == "__main__":
    main() 