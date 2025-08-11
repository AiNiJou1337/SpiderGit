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

# 重新设计的 GitHub Token 管理器
class GitHubTokenManager:
    def __init__(self):
        """初始化 Token 管理器，支持动态 Token 配置"""
        self.tokens = []
        self.current_index = 0
        self.rate_limits = {}
        self.last_used = {}
        self.error_counts = {}
        self.token_status = {}  # 记录每个 Token 的状态

        # 动态加载所有 GITHUB_TOKEN_ 开头的环境变量
        self._load_tokens_from_env()

        # 验证所有 Token 的有效性
        self._validate_tokens()

        logger.info(f"Token 管理器初始化完成: {len(self.tokens)} 个有效 Token")

    def _load_tokens_from_env(self):
        """从环境变量动态加载所有 GitHub Token"""
        token_prefix = 'GITHUB_TOKEN_'

        for key, value in os.environ.items():
            if key.startswith(token_prefix) and value.strip():
                token_name = key[len(token_prefix):]  # 移除前缀
                self.tokens.append((token_name, value.strip()))
                logger.info(f"发现 Token: {token_name}")

        if not self.tokens:
            logger.warning("未发现任何 GitHub Token，将使用无认证模式")

    def _validate_tokens(self):
        """验证所有 Token 的有效性"""
        valid_tokens = []

        for token_name, token in self.tokens:
            if self._is_token_valid(token):
                valid_tokens.append((token_name, token))
                self.token_status[token] = 'valid'
                logger.info(f"Token {token_name} 验证通过")
            else:
                self.token_status[token] = 'invalid'
                logger.warning(f"Token {token_name} 无效或已过期")

        self.tokens = valid_tokens

    def _is_token_valid(self, token):
        """验证单个 Token 是否有效"""
        headers = HEADERS.copy()
        headers['Authorization'] = f'token {token}'

        try:
            response = requests.get('https://api.github.com/rate_limit', headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                # 存储速率限制信息
                self.rate_limits[token] = data['resources']['core']
                return True
            elif response.status_code == 401:
                logger.warning(f"Token 认证失败: {response.json().get('message', 'Unknown error')}")
                return False
            else:
                logger.warning(f"Token 验证返回状态码: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Token 验证时发生错误: {e}")
            return False

    def get_available_token(self):
        """获取当前可用的 Token"""
        if not self.tokens:
            return None

        # 尝试所有 Token
        attempts = 0
        max_attempts = len(self.tokens)

        while attempts < max_attempts:
            token_name, token = self.tokens[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.tokens)
            attempts += 1

            # 检查错误次数
            if self.error_counts.get(token, 0) >= 5:
                logger.warning(f"Token {token_name} 错误次数过多，跳过")
                continue

            # 检查速率限制
            remaining = self._check_rate_limit(token)
            if remaining > 0:
                self.last_used[token] = time.time()
                logger.info(f"使用 Token: {token_name} (剩余: {remaining})")
                return token
            else:
                logger.warning(f"Token {token_name} 速率限制已达上限")
                continue

        logger.warning("所有 Token 都不可用")
        return None

    def _check_rate_limit(self, token):
        """检查 Token 的速率限制"""
        # 如果已有缓存的速率限制信息，且时间未过期，直接使用
        if token in self.rate_limits:
            limits = self.rate_limits[token]
            if time.time() < limits['reset']:
                return limits['remaining']

        # 重新获取速率限制信息
        headers = HEADERS.copy()
        headers['Authorization'] = f'token {token}'

        try:
            response = requests.get('https://api.github.com/rate_limit', headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                limits = data['resources']['core']
                self.rate_limits[token] = limits
                return limits['remaining']
            else:
                logger.warning(f"获取速率限制失败: {response.status_code}")
                return 0
        except Exception as e:
            logger.error(f"检查速率限制时发生错误: {e}")
            return 0

    def record_success(self, token):
        """记录 Token 成功使用"""
        if token in self.error_counts:
            self.error_counts[token] = max(0, self.error_counts[token] - 1)

    def record_error(self, token):
        """记录 Token 错误"""
        self.error_counts[token] = self.error_counts.get(token, 0) + 1
        logger.warning(f"Token 错误计数: {self.error_counts[token]}")

        # 如果错误次数过多，标记为无效
        if self.error_counts[token] >= 5:
            self.token_status[token] = 'error_limit_exceeded'

    def get_status_summary(self):
        """获取 Token 状态摘要"""
        summary = {
            'total_tokens': len(self.tokens),
            'valid_tokens': len([t for t in self.tokens if self.token_status.get(t[1]) == 'valid']),
            'rate_limits': {}
        }

        for token_name, token in self.tokens:
            if token in self.rate_limits:
                limits = self.rate_limits[token]
                summary['rate_limits'][token_name] = {
                    'remaining': limits['remaining'],
                    'limit': limits['limit'],
                    'reset_time': datetime.datetime.fromtimestamp(limits['reset']).isoformat()
                }

        return summary

# 创建全局 Token 管理器实例
token_manager = GitHubTokenManager()

# 重新设计的 API 请求函数
def github_api_request(url, params=None, raw_content=False, max_retries=3):
    """
    发送 GitHub API 请求，支持 Token 认证和无认证降级

    Args:
        url: API 端点 URL
        params: 请求参数
        raw_content: 是否返回原始内容
        max_retries: 最大重试次数

    Returns:
        API 响应数据
    """
    retry_count = 0
    last_error = None

    while retry_count < max_retries:
        # 尝试获取可用 Token
        token = token_manager.get_available_token()

        headers = HEADERS.copy()

        if token:
            headers['Authorization'] = f'token {token}'
        else:
            # 无 Token 时使用无认证请求
            if retry_count == 0:
                logger.warning("使用无认证请求访问 GitHub API（速率限制：60次/小时）")

        if raw_content:
            headers['Accept'] = 'application/vnd.github.v3.raw'
        else:
            headers['Accept'] = 'application/json'

        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)

            # 处理不同的响应状态
            if response.status_code == 200:
                # 成功
                if token:
                    token_manager.record_success(token)

                if raw_content:
                    return response.text
                return response.json()

            elif response.status_code == 401:
                # 认证失败
                if token:
                    logger.error(f"Token 认证失败: {response.json().get('message', 'Unknown error')}")
                    token_manager.record_error(token)
                    # 尝试下一个 Token
                    retry_count += 1
                    continue
                else:
                    # 无认证请求也失败，可能是需要认证的端点
                    raise requests.exceptions.HTTPError(f"需要认证访问: {response.status_code}")

            elif response.status_code == 403:
                # 速率限制或其他限制
                error_msg = response.json().get('message', '')

                if 'rate limit exceeded' in error_msg.lower():
                    if token:
                        logger.warning("Token 速率限制已达上限，尝试其他 Token")
                        token_manager.record_error(token)
                    else:
                        logger.warning("无认证请求速率限制已达上限，等待重置")
                        time.sleep(60)  # 等待无认证速率限制重置

                    retry_count += 1
                    continue

                elif 'abuse detection' in error_msg.lower():
                    logger.warning("触发 GitHub 滥用检测，等待后重试")
                    time.sleep(30)
                    retry_count += 1
                    continue
                else:
                    # 其他 403 错误
                    raise requests.exceptions.HTTPError(f"访问被拒绝: {error_msg}")

            elif response.status_code == 404:
                # 资源不存在
                logger.warning(f"资源不存在: {url}")
                return None

            else:
                # 其他错误
                response.raise_for_status()

        except requests.exceptions.Timeout:
            logger.warning(f"请求超时，重试中... ({retry_count + 1}/{max_retries})")
            last_error = "请求超时"
            retry_count += 1
            time.sleep(2 ** retry_count)  # 指数退避
            continue

        except requests.exceptions.ConnectionError:
            logger.warning(f"连接错误，重试中... ({retry_count + 1}/{max_retries})")
            last_error = "连接错误"
            retry_count += 1
            time.sleep(2 ** retry_count)
            continue

        except requests.exceptions.HTTPError as e:
            if token:
                token_manager.record_error(token)
            raise e

        except Exception as e:
            logger.error(f"未知错误: {e}")
            if token:
                token_manager.record_error(token)
            last_error = str(e)
            retry_count += 1
            continue

    # 所有重试都失败
    error_msg = f"达到最大重试次数 ({max_retries})，最后错误: {last_error}"
    logger.error(error_msg)
    raise Exception(error_msg)

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