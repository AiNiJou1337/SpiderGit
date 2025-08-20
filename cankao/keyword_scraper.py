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

# 导入代码分析器
from code_analyzer import CodeAnalyzer

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

# 修改GitHub API认证相关的代码
class GitHubTokenManager:
    def __init__(self):
        self.tokens = [
            ('PQG', os.environ.get('GITHUB_TOKEN_PQG', '')),
            ('LR', os.environ.get('GITHUB_TOKEN_LR', '')),
            ('HXZ', os.environ.get('GITHUB_TOKEN_HXZ', ''))
        ]
        # 过滤掉空token
        self.tokens = [(name, token) for name, token in self.tokens if token]
        
        if not self.tokens:
            logger.error("没有配置任何GitHub Token，请在.env文件中配置至少一个token")
            raise ValueError("未配置GitHub Token")
            
        self.current_index = 0
        self.rate_limits = {}
        self.last_used = {}
        self.error_counts = {}  # 记录每个token的错误次数
        
        logger.info(f"成功初始化 {len(self.tokens)} 个GitHub Token")
        
    def get_next_token(self):
        """获取下一个可用的token"""
        if not self.tokens:
            logger.error("没有可用的GitHub Token")
            return None
            
        # 轮换选择token
        initial_index = self.current_index
        while True:
            token_info = self.tokens[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.tokens)
            
            token_name, token = token_info
            # 检查token是否有太多错误
            if self.error_counts.get(token, 0) >= 5:
                logger.warning(f"Token {token_name} 已达到最大错误次数，跳过")
                if self.current_index == initial_index:
                    logger.error("所有Token都已达到错误限制")
                    return None
                continue
                
            self.last_used[token] = time.time()
            logger.info(f"使用Token: {token_name}")
            return token
            
    def record_error(self, token):
        """记录token的错误"""
        self.error_counts[token] = self.error_counts.get(token, 0) + 1
        logger.warning(f"Token错误次数: {self.error_counts[token]}")
        
    def record_success(self, token):
        """记录token的成功使用"""
        if token in self.error_counts:
            self.error_counts[token] = max(0, self.error_counts[token] - 1)
            
    def check_rate_limit(self, token):
        """检查token的使用限制"""
        headers = HEADERS.copy()
        headers['Authorization'] = f'token {token}'
        
        try:
            response = requests.get('https://api.github.com/rate_limit', headers=headers)
            if response.ok:
                data = response.json()
                limits = data['resources']['core']
                self.rate_limits[token] = limits
                
                # 记录详细的限制信息
                logger.info(f"Rate Limit - 剩余: {limits['remaining']}, 总量: {limits['limit']}, "
                          f"重置时间: {datetime.datetime.fromtimestamp(limits['reset'])}")
                
                return limits['remaining']
            else:
                logger.error(f"检查速率限制失败: {response.status_code} - {response.text}")
                return 0
        except Exception as e:
            logger.error(f"检查速率限制时发生错误: {e}")
            return 0
            
    def get_available_token(self):
        """获取当前可用的token"""
        for _ in range(len(self.tokens)):
            token = self.get_next_token()
            if not token:
                continue
                
            remaining = self.check_rate_limit(token)
            if remaining > 0:
                return token
            else:
                reset_time = self.rate_limits[token]['reset']
                wait_time = reset_time - time.time()
                if wait_time > 0:
                    logger.warning(f"Token速率限制将在 {wait_time:.2f} 秒后重置")
                    
        return None

# 创建token管理器实例
token_manager = GitHubTokenManager()

# 修改API请求函数
def github_api_request(url, params=None, raw_content=False):
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        token = token_manager.get_available_token()
        if not token:
            wait_time = 60  # 默认等待时间
            logger.warning(f"所有Token都已达到限制，等待 {wait_time} 秒后重试")
            time.sleep(wait_time)
            retry_count += 1
            continue
            
        headers = HEADERS.copy()
        headers['Authorization'] = f'token {token}'
        
        if raw_content:
            headers['Accept'] = 'application/vnd.github.v3.raw'
        else:
            headers['Accept'] = 'application/json'
        
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            # 记录成功使用
            token_manager.record_success(token)
            
            # 如果请求成功，返回结果
            if raw_content:
                return response.text
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 403:
                if 'rate limit exceeded' in str(e.response.content):
                    logger.warning(f"Token速率限制已达到，尝试使用下一个token")
                    retry_count += 1
                    continue
                elif 'abuse detection' in str(e.response.content):
                    logger.warning(f"触发滥用检测，等待后重试")
                    time.sleep(30)
                    retry_count += 1
                    continue
            token_manager.record_error(token)
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"请求失败: {e}")
            token_manager.record_error(token)
            retry_count += 1
            continue
        except Exception as e:
            logger.error(f"未知错误: {e}")
            token_manager.record_error(token)
            raise
            
    raise Exception("达到最大重试次数，所有Token都不可用")

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

# 从仓库获取代码文件并分析
def fetch_and_analyze_code(repo_data, repo_id, conn):
    try:
        repo_full_name = repo_data['full_name']
        logger.info(f"分析仓库代码: {repo_full_name}")
        
        # 获取仓库内容列表
        contents_url = f"https://api.github.com/repos/{repo_full_name}/contents"
        contents = github_api_request(contents_url)
        
        if not isinstance(contents, list):
            logger.warning(f"获取仓库内容失败: {repo_full_name}")
            return
            
        # 过滤出代码文件
        code_files = []
        for item in contents:
            if item['type'] == 'file' and _is_code_file(item['name']):
                code_files.append(item)
            
        # 限制分析的文件数量
        if len(code_files) > 10:
            code_files = code_files[:10]  # 只分析前10个文件
            
        # 初始化代码分析器
        analyzer = CodeAnalyzer()
        
        # 分析每个代码文件
        for file_item in code_files:
            try:
                # 获取文件内容 - 修改为获取原始内容
                file_content = github_api_request(file_item['download_url'], raw_content=True)
                
                if not file_content:
                    continue
                    
                # 分析代码
                analysis_result = analyzer.analyze_file(file_item['path'], file_content)
                
                if not analysis_result:
                    continue
                    
                # 保存到数据库
                save_code_file(conn, repo_id, file_item['name'], file_item['path'], file_content, analysis_result)
                
                # 延迟避免请求过快
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"分析文件失败: {file_item['path']} - {e}")
                continue
                
    except Exception as e:
        logger.error(f"获取仓库代码失败: {repo_full_name} - {e}")

# 判断是否为代码文件
def _is_code_file(filename):
    code_extensions = ['.py', '.java', '.js', '.jsx', '.ts', '.tsx', '.php', '.rb', '.go', '.c', '.cpp', '.h', '.hpp', '.cs']
    ext = os.path.splitext(filename)[1].lower()
    return ext in code_extensions

# 保存代码文件分析结果到数据库
def save_code_file(conn, repo_id, filename, file_path, content, analysis_result):
    try:
        with conn.cursor() as cursor:
            # 检查文件是否已存在
            cursor.execute('SELECT id FROM "code_files" WHERE "repository_id" = %s AND "path" = %s', (repo_id, file_path))
            existing_file = cursor.fetchone()
            
            # 提取内容的前5000个字符作为片段
            content_sample = content[:5000] if content else None
            
            if existing_file:
                # 更新现有文件
                file_id = existing_file[0]
                cursor.execute('''
                    UPDATE "code_files" 
                    SET "content" = %s, 
                        "importedLibraries" = %s,
                        "functions" = %s,
                        "api_endpoints" = %s,
                        "updated_at" = %s
                    WHERE id = %s
                ''', (
                    content_sample,
                    analysis_result.get('importedLibraries', []),
                    analysis_result.get('functions', []),
                    analysis_result.get('api_endpoints', []),
                    datetime.datetime.now(),
                    file_id
                ))
            else:
                # 插入新文件记录
                cursor.execute('''
                    INSERT INTO "code_files" (
                        "repository_id", "filename", "path", "content", 
                        "importedLibraries", "functions", "api_endpoints", 
                        "created_at", "updated_at", "packages", "components"
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (
                    repo_id,
                    filename,
                    file_path,
                    content_sample,
                    analysis_result.get('importedLibraries', []),
                    analysis_result.get('functions', []),
                    analysis_result.get('api_endpoints', []),
                    datetime.datetime.now(),
                    datetime.datetime.now(),
                    [],  # 保留原有packages字段
                    []   # 保留原有components字段
                ))
                
            conn.commit()
            logger.info(f"已保存文件分析结果: {file_path}")
            
    except Exception as e:
        logger.error(f"保存代码文件失败: {e}")
        conn.rollback()

# 将仓库数据保存到数据库，添加代码分析功能
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
            
            # 分析代码文件（新增）
            fetch_and_analyze_code(repo_data, repo_id, conn)
            
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
def crawl_by_keyword(keyword, conn, task_id=None, languages=None, limits=None):
    try:
        # 设置默认值
        if not languages:
            languages = ["python", "java"]
        
        if not limits:
            limits = {"python": 50, "java": 30}
        
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
        
        language_counts = {}
        total_repos = 0
        progress_base = 5
        
        # 爬取部分最多占85%的进度
        max_crawl_progress = 85
        progress_per_language = max_crawl_progress / len(languages)
        
        # 遍历所有要爬取的语言
        for i, language in enumerate(languages):
            max_results = limits.get(language.lower(), 30)  # 默认每种语言30个
            
            logger.info(f"搜索关键词 '{keyword}' 的 {language} 项目，数量限制: {max_results}")
            repos = search_github_repositories(keyword, language=language, max_results=max_results)
            language_counts[language] = len(repos)
            
            # 当前语言开始时的进度
            language_start_progress = progress_base + i * progress_per_language
            
            if task_id:
                update_task_status(conn, task_id, 'running', 
                                 language_start_progress, 
                                 f"找到 {len(repos)} 个 {language} 项目，正在处理...")
            
            # 保存项目
            for j, repo in enumerate(repos):
                repo_data = format_repository_data(repo)
                save_repository(conn, repo_data, keyword_id, task_id)
                
                # 每5个仓库更新一次进度，确保不超过下一个语言的起始进度
                if task_id and j % 5 == 0 and len(repos) > 0:
                    sub_progress_ratio = j / len(repos)
                    current_progress = language_start_progress + (sub_progress_ratio * progress_per_language)
                    # 确保进度不会超过当前语言分配的最大进度
                    max_current_language_progress = language_start_progress + progress_per_language
                    current_progress = min(current_progress, max_current_language_progress)
                    
                    update_task_status(conn, task_id, 'running', 
                                    current_progress, 
                                    f"已处理 {j+1}/{len(repos)} 个 {language} 项目")
                
                # 延迟，避免请求过快
                time.sleep(REQUEST_DELAY)
            
            # 更新总数
            total_repos += len(repos)
            # 不再累加progress_base，因为我们现在使用语言索引计算进度
        
        # 更新任务状态为完成，进度固定为90%，为数据分析留出10%
        if task_id:
            update_task_status(conn, task_id, 'running', 90, 
                             f"爬取完成，共处理 {total_repos} 个项目，正在准备分析...",
                             total_repos=total_repos)
        
        logger.info(f"关键词 '{keyword}' 爬取完成，共保存 {total_repos} 个仓库")
        return language_counts
    except Exception as e:
        logger.error(f"爬取失败: {e}")
        logger.error(traceback.format_exc())
        
        if task_id:
            update_task_status(conn, task_id, 'failed', 0, f"爬取过程出错: {str(e)[:200]}")
        return None

# 主函数
def main():
    parser = argparse.ArgumentParser(description='GitHub关键词爬虫')
    parser.add_argument('--keywords', type=str, required=True, help='要搜索的关键词，多个关键词用逗号分隔')
    parser.add_argument('--task-id', type=int, help='任务ID，用于更新任务状态')
    parser.add_argument('--languages', type=str, help='要搜索的编程语言，多个语言用逗号分隔，例如: python,java,javascript')
    parser.add_argument('--limits', type=str, help='各语言的爬取数量限制，例如: python=50,java=30,javascript=20')
    
    args = parser.parse_args()
    keywords = [k.strip() for k in args.keywords.split(',')]
    task_id = args.task_id
    
    # 处理语言和数量限制
    languages = None
    limits = None
    
    if args.languages:
        languages = [lang.strip().lower() for lang in args.languages.split(',')]
    
    if args.limits:
        limits = {}
        for limit_item in args.limits.split(','):
            if '=' in limit_item:
                lang, count = limit_item.split('=')
                try:
                    limits[lang.strip().lower()] = int(count.strip())
                except ValueError:
                    logger.warning(f"无效的数量限制: {limit_item}，将使用默认值")
    
    conn = get_db_connection()
    
    try:
        for keyword in keywords:
            logger.info(f"开始爬取关键词: {keyword}")
            crawl_by_keyword(keyword, conn, task_id, languages, limits)
    except Exception as e:
        logger.error(f"未处理的异常: {e}")
        logger.error(traceback.format_exc())
        if task_id:
            update_task_status(conn, task_id, 'failed', 0, f"未处理的异常: {str(e)[:200]}")
    finally:
        conn.close()

if __name__ == "__main__":
    main() 