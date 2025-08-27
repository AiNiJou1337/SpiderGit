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
from collections import Counter

# 设置控制台编码，解决Windows乱码问题
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

# 强制禁用代理
os.environ.pop('HTTP_PROXY', None)
os.environ.pop('HTTPS_PROXY', None)
os.environ.pop('http_proxy', None)
os.environ.pop('https_proxy', None)

# 设置日志（必须在使用logger之前）
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('keyword_scraper')

# 导入代码分析器
try:
    from analyzers.code_analyzer import CodeAnalyzer
except ImportError:
    logger.warning("无法导入代码分析器，将跳过代码分析功能")
    CodeAnalyzer = None

# 数据库连接信息
DB_URL = os.environ.get('DATABASE_URL')
if not DB_URL:
    # 从.env文件读取
    env_path = Path(__file__).parent.parent.parent / '.env'
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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# API 限制配置
API_DELAY = 1  # 请求间隔（秒）
MAX_RETRIES = 3  # 最大重试次数
REQUEST_DELAY = 2  # 请求延迟（秒）

# GitHub Token管理器
class GitHubTokenManager:
    def __init__(self):
        self.tokens = [
            ('PQG', os.environ.get('GITHUB_TOKEN_PQG', '')),
            ('LR', os.environ.get('GITHUB_TOKEN_LR', '')),
            ('HXZ', os.environ.get('GITHUB_TOKEN_HXZ', '')),
            ('XHY', os.environ.get('GITHUB_TOKEN_XHY', ''))
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

            # 检查速率限制
            if token in self.rate_limits:
                remaining, reset_time = self.rate_limits[token]
                if remaining <= 0 and time.time() < reset_time:
                    wait_time = reset_time - time.time()
                    logger.warning(f"Token {token_name} 速率限制，等待 {wait_time:.2f} 秒")
                    if self.current_index == initial_index:
                        # 所有token都被限制，等待最短的重置时间
                        min_wait = min([reset_time - time.time() for _, (_, reset_time) in self.rate_limits.items() if reset_time > time.time()])
                        if min_wait > 0:
                            logger.info(f"所有token都被限制，等待 {min_wait:.2f} 秒")
                            time.sleep(min_wait + 1)
                        continue
                    continue

            return token_info

    def record_error(self, token):
        """记录token错误"""
        self.error_counts[token] = self.error_counts.get(token, 0) + 1

    def update_rate_limit(self, token, remaining, reset_time):
        """更新速率限制信息"""
        self.rate_limits[token] = (remaining, reset_time)

# 创建token管理器实例
token_manager = GitHubTokenManager()

def get_db_connection():
    """获取数据库连接"""
    try:
        conn = psycopg2.connect(DB_URL)
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        raise

def update_task_status(conn, task_id, status, progress, message=None, python_repos=None, java_repos=None, total_repos=None):
    """更新任务状态"""
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

            # 构建SQL语句（使用双引号包围字段名）
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

def search_github_repositories(keyword, language=None, limit=50):
    """搜索GitHub仓库"""
    repositories = []
    page = 1
    per_page = min(100, limit)  # GitHub API 每页最多100个结果

    # 测试网络连接
    try:
        test_response = requests.get('https://api.github.com', proxies={}, timeout=5)
        network_available = True
    except:
        logger.warning("网络连接失败，将使用模拟数据")
        network_available = False

    # 如果网络不可用，返回空列表（后续会使用模拟数据）
    if not network_available:
        logger.info(f"网络不可用，跳过 {keyword} ({language}) 的实际爬取")
        return []

    while len(repositories) < limit:
        try:
            # 获取可用的token
            token_info = token_manager.get_next_token()
            if not token_info:
                logger.error("没有可用的GitHub Token")
                break

            token_name, token = token_info

            # 构建搜索查询
            query = keyword
            if language:
                query += f" language:{language}"

            url = "https://api.github.com/search/repositories"
            params = {
                'q': query,
                'sort': 'stars',
                'order': 'desc',
                'page': page,
                'per_page': per_page
            }

            # 设置请求头
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Authorization': f'token {token}',
                'Accept': 'application/vnd.github.v3+json'
            }

            logger.info(f"搜索 {keyword} (语言: {language or '全部'}) - 第 {page} 页")

            # 配置代理（如果需要）
            proxies = None
            try:
                # 尝试不使用代理
                response = requests.get(url, headers=headers, params=params, proxies=proxies, timeout=30)
            except requests.exceptions.ProxyError:
                # 如果代理失败，尝试直连
                response = requests.get(url, headers=headers, params=params, proxies={}, timeout=30)

            # 更新速率限制信息
            if 'X-RateLimit-Remaining' in response.headers:
                remaining = int(response.headers['X-RateLimit-Remaining'])
                reset_time = int(response.headers['X-RateLimit-Reset'])
                token_manager.update_rate_limit(token, remaining, reset_time)

            if response.status_code == 401:
                logger.error(f"Token {token_name} 认证失败: {response.text}")
                token_manager.record_error(token)
                continue
            elif response.status_code == 403:
                logger.warning(f"Token {token_name} API 限制，切换token...")
                token_manager.record_error(token)
                continue
            elif response.status_code == 422:
                logger.warning(f"搜索查询无效: {query}")
                break
            elif response.status_code != 200:
                logger.error(f"搜索失败: {response.status_code} - {response.text}")
                token_manager.record_error(token)
                break

            data = response.json()
            items = data.get('items', [])
            
            if not items:
                logger.info(f"第 {page} 页没有更多结果")
                break
            
            for repo in items:
                if len(repositories) >= limit:
                    break
                
                repositories.append({
                    'id': repo['id'],
                    'name': repo['name'],
                    'full_name': repo['full_name'],
                    'owner': repo['owner']['login'],
                    'description': repo.get('description', ''),
                    'html_url': repo['html_url'],
                    'language': repo.get('language'),
                    'stargazers_count': repo['stargazers_count'],
                    'forks_count': repo['forks_count'],
                    'watchers_count': repo['watchers_count'],
                    'size': repo['size'],
                    'created_at': repo['created_at'],
                    'updated_at': repo['updated_at'],
                    'pushed_at': repo['pushed_at'],
                    'topics': repo.get('topics', []),  # 添加 topics 字段
                    'keyword': keyword,
                    'scraped_at': datetime.datetime.now().isoformat()
                })
            
            page += 1
            time.sleep(API_DELAY)  # 避免触发速率限制
            
        except Exception as e:
            logger.error(f"搜索过程中出错: {e}")
            break
    
    logger.info(f"搜索完成，找到 {len(repositories)} 个仓库")
    return repositories

def save_repository_to_db(conn, repo_data):
    """保存仓库数据到数据库"""
    try:
        cursor = conn.cursor()
        
        # 检查仓库是否已存在（使用full_name作为唯一标识，使用正确表名）
        cursor.execute('SELECT id FROM "repositories" WHERE "full_name" = %s', (repo_data['full_name'],))
        existing = cursor.fetchone()
        
        if existing:
            # 更新现有记录（使用正确表名）
            cursor.execute('''
                UPDATE "repositories" SET
                    "name" = %s, "owner" = %s, "description" = %s,
                    "url" = %s, "language" = %s, "stars" = %s,
                    "forks" = %s, "updated_at" = %s, "trending" = %s,
                    "trend_date" = %s, "trend_period" = %s
                WHERE "full_name" = %s
                RETURNING id
            ''', (
                repo_data['name'], repo_data['owner'],
                repo_data.get('description', ''), repo_data['html_url'], repo_data.get('language'),
                repo_data['stargazers_count'], repo_data['forks_count'],
                datetime.datetime.now(), True,
                datetime.datetime.now(), 'keyword', repo_data['full_name']
            ))
            repo_id = cursor.fetchone()[0]
        else:
            # 插入新记录（使用正确表名）
            cursor.execute('''
                INSERT INTO "repositories" (
                    "name", "owner", "full_name", "description", "url",
                    "language", "stars", "forks", "created_at", "updated_at",
                    "trending", "trend_date", "trend_period", "tags"
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            ''', (
                repo_data['name'], repo_data['owner'], repo_data['full_name'],
                repo_data.get('description', ''), repo_data['html_url'],
                repo_data.get('language'), repo_data['stargazers_count'],
                repo_data['forks_count'], datetime.datetime.now(), datetime.datetime.now(),
                True, datetime.datetime.now(), 'keyword', repo_data.get('topics', [])
            ))
            repo_id = cursor.fetchone()[0]
        
        # 保存关键词关联（使用正确表名）
        # 首先获取或创建关键词ID
        cursor.execute('SELECT id FROM "keywords" WHERE "text" = %s', (repo_data['keyword'],))
        keyword_record = cursor.fetchone()
        if not keyword_record:
            cursor.execute('INSERT INTO "keywords" ("text", "created_at") VALUES (%s, %s) RETURNING id',
                         (repo_data['keyword'], datetime.datetime.now()))
            keyword_id = cursor.fetchone()[0]
        else:
            keyword_id = keyword_record[0]

        # 创建仓库-关键词关联（使用正确字段名）
        cursor.execute('''
            INSERT INTO "repository_keywords" ("repositoryId", "keywordId", "created_at")
            VALUES (%s, %s, %s)
            ON CONFLICT ("repositoryId", "keywordId") DO NOTHING
        ''', (repo_id, keyword_id, datetime.datetime.now()))
        
        conn.commit()
        cursor.close()
        return repo_id
        
    except Exception as e:
        logger.error(f"保存仓库数据失败: {e}")
        conn.rollback()
        return None

def analyze_repository_code(repo_data):
    """分析仓库代码"""
    if not CodeAnalyzer:
        return None

    try:
        analyzer = CodeAnalyzer()

        # 获取仓库内容（携带 Token 认证，带重试与降级）
        api_url = f"https://api.github.com/repos/{repo_data['full_name']}/contents"

        def request_with_auth(url: str, is_raw: bool = False):
            # 先尝试使用 token 认证，请求失败则轮换 token；最终回退为匿名请求
            last_err = None
            # 最多尝试 token 数量的两倍（容错）
            max_attempts = max(3, len(token_manager.tokens) * 2) if hasattr(token_manager, 'tokens') else 3
            for _ in range(max_attempts):
                token_info = token_manager.get_next_token() if 'token_manager' in globals() else None
                headers = dict(HEADERS)
                headers['Accept'] = 'application/vnd.github.v3+json'
                if is_raw:
                    headers['Accept'] = 'application/vnd.github.v3.raw'
                if token_info:
                    _, token = token_info
                    headers['Authorization'] = f'token {token}'
                try:
                    resp = requests.get(url, headers=headers, timeout=30)
                except requests.exceptions.RequestException as e:
                    last_err = e
                    continue

                # 速率限制信息更新
                if token_info and 'X-RateLimit-Remaining' in resp.headers and 'X-RateLimit-Reset' in resp.headers:
                    try:
                        remaining = int(resp.headers.get('X-RateLimit-Remaining', '0'))
                        reset_time = int(resp.headers.get('X-RateLimit-Reset', '0'))
                        token_manager.update_rate_limit(token, remaining, reset_time)
                    except Exception:
                        pass

                if resp.status_code == 200:
                    return resp
                elif resp.status_code in (401, 403):
                    # 认证或限流失败，轮换 token 继续
                    if token_info:
                        token_manager.record_error(token)
                    last_err = Exception(f"HTTP {resp.status_code}: {resp.text[:120]}")
                    continue
                elif resp.status_code == 404:
                    # 资源不存在，直接返回
                    return resp
                else:
                    last_err = Exception(f"HTTP {resp.status_code}: {resp.text[:120]}")
                    continue

            # 最后匿名再试一次
            try:
                headers = dict(HEADERS)
                headers['Accept'] = 'application/vnd.github.v3+json'
                if is_raw:
                    headers['Accept'] = 'application/vnd.github.v3.raw'
                return requests.get(url, headers=headers, timeout=30)
            except Exception as e:
                raise last_err or e

        response = request_with_auth(api_url)
        if response.status_code != 200:
            logger.warning(f"无法获取仓库内容: {repo_data['full_name']} - {response.status_code}")
            return None

        contents = response.json()

        # 分析代码文件
        analysis_results = []
        for item in contents[:20]:  # 限制分析文件数量
            if item['type'] == 'file' and item['name'].endswith(('.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rs')):
                try:
                    # 获取文件内容（使用 raw 接受头，优先避免 HTML 包装）
                    file_resp = request_with_auth(item['download_url'], is_raw=True)
                    if file_resp.status_code == 200:
                        file_content = file_resp.text
                        file_analysis = analyzer.analyze_file(item['path'], file_content)
                        if file_analysis:
                            analysis_results.append(file_analysis)
                except Exception as e:
                    logger.warning(f"分析文件 {item['path']} 失败: {e}")
                    continue

        return {
            'repository_id': repo_data.get('db_id'),
            'files_analyzed': len(analysis_results),
            'analysis_results': analysis_results,
            'analyzed_at': datetime.datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"代码分析失败: {e}")
        return None

def save_code_analysis_to_db(conn, analysis_data):
    """保存代码分析结果到数据库"""
    if not analysis_data or not analysis_data.get('analysis_results'):
        logger.warning("没有分析结果需要保存")
        return

    try:
        cursor = conn.cursor()
        saved_count = 0

        for file_analysis in analysis_data['analysis_results']:
            # 根据实际数据库列名进行映射
            file_path = file_analysis.get('file_path', '')
            filename = file_path.split('/')[-1] if file_path else None
            imports = file_analysis.get('imports', [])
            language = file_analysis.get('language', '')

            if not file_path or not filename:
                logger.warning(f"跳过无效文件分析结果: {file_analysis}")
                continue

            # 使用 ON CONFLICT 进行 upsert（现在有唯一约束了）
            cursor.execute("""
                INSERT INTO code_files (
                    repository_id, filename, path, content, comments,
                    functions, packages, components, api_endpoints,
                    "importedLibraries", created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, NOW(), NOW()
                )
                ON CONFLICT (repository_id, path) DO UPDATE SET
                    filename = EXCLUDED.filename,
                    content = EXCLUDED.content,
                    comments = EXCLUDED.comments,
                    functions = EXCLUDED.functions,
                    packages = EXCLUDED.packages,
                    components = EXCLUDED.components,
                    api_endpoints = EXCLUDED.api_endpoints,
                    "importedLibraries" = EXCLUDED."importedLibraries",
                    updated_at = NOW()
            """, (
                analysis_data['repository_id'],
                filename,
                file_path,
                None,            # content 暂不存全文
                f"Language: {language}",  # comments: 存储语言信息
                imports,         # functions: 使用 imports 占位
                imports,         # packages: 使用 imports 占位
                [],              # components: 空数组
                [],              # api_endpoints: 空数组
                imports,         # importedLibraries: 导入的库列表
            ))
            saved_count += 1

        conn.commit()
        cursor.close()
        logger.info(f"保存了 {saved_count} 个文件的分析结果")

    except Exception as e:
        logger.error(f"保存代码分析结果失败: {e}")
        logger.error(f"错误详情: {str(e)}")
        conn.rollback()
        if 'cursor' in locals():
            cursor.close()

# 已弃用：使用 backend/scraper/analyzers/data_analysis.py 进行分析
def generate_analysis_json_deprecated(conn, keyword, task_id=None):
    """生成关键词分析的JSON文件 - 已弃用，请使用 data_analysis.py"""
    try:
        # 获取关键词ID
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM "keywords" WHERE "text" = %s', (keyword,))
        keyword_record = cursor.fetchone()

        if not keyword_record:
            logger.error(f"未找到关键词: {keyword}")
            return False

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
            repositories.append({
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
            })

        if not repositories:
            logger.warning(f"关键词 '{keyword}' 没有关联的仓库")
            return False

        # 获取代码文件数据
        repo_ids = [repo['id'] for repo in repositories]
        if repo_ids:
            placeholder = ','.join(['%s'] * len(repo_ids))
            cursor.execute(f'''
                SELECT repository_id, filename, path, "importedLibraries", functions, packages, components
                FROM "code_files"
                WHERE repository_id IN ({placeholder})
            ''', repo_ids)

            code_files = []
            for row in cursor.fetchall():
                code_files.append({
                    'repository_id': row[0],
                    'filename': row[1],
                    'path': row[2],
                    'imported_libraries': row[3] if row[3] else [],
                    'functions': row[4] if row[4] else [],
                    'packages': row[5] if row[5] else [],
                    'components': row[6] if row[6] else []
                })
        else:
            code_files = []

        # 分析数据
        language_stats = {}
        all_libraries = []
        all_packages = []
        all_functions = []

        # 统计语言分布
        for repo in repositories:
            lang = repo['language']
            if lang and lang.strip():  # 确保语言不为空或空白
                language_stats[lang] = language_stats.get(lang, 0) + 1

        # 统计代码分析数据
        for file_data in code_files:
            all_libraries.extend(file_data['imported_libraries'])
            all_packages.extend(file_data['packages'])
            all_functions.extend(file_data['functions'])

        # 调试信息
        logger.info(f"语言统计: {language_stats}")
        logger.info(f"代码文件数量: {len(code_files)}")
        logger.info(f"库数量: {len(all_libraries)}")
        logger.info(f"包数量: {len(all_packages)}")
        logger.info(f"函数数量: {len(all_functions)}")

        # 生成分析结果
        analysis_result = {
            'keyword': keyword,
            'repository_count': len(repositories),
            'analysis_date': datetime.datetime.now().isoformat(),
            'charts': {
                'language_distribution': {
                    'data': language_stats
                },
                'common_packages': {
                    'data': dict(Counter(all_packages).most_common(20))
                },
                'imported_libraries': {
                    'data': dict(Counter(all_libraries).most_common(20))
                },
                'common_functions': {
                    'data': dict(Counter(all_functions).most_common(20))
                }
            },
            'repositories': repositories
        }

        # 保存到JSON文件
        analytics_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'public', 'analytics')
        os.makedirs(analytics_dir, exist_ok=True)

        safe_keyword = "".join(c for c in keyword if c.isalnum() or c in (' ', '-', '_')).rstrip()
        result_file = os.path.join(analytics_dir, f'analysis_{safe_keyword}.json')

        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(analysis_result, f, ensure_ascii=False, indent=2)

        logger.info(f"分析结果已保存到 {result_file}")
        cursor.close()
        return True

    except Exception as e:
        logger.error(f"生成分析JSON失败: {e}")
        logger.error(f"错误详情: {str(e)}")
        if 'cursor' in locals():
            cursor.close()
        return False

def crawl_by_keyword(keyword, conn, task_id=None, languages=None, limits=None):
    """根据关键词爬取仓库"""
    try:
        # 默认语言列表
        if not languages:
            languages = ['python', 'javascript', 'java', 'typescript', 'go', 'rust', 'c', 'cpp']

        # 默认限制
        if not limits:
            limits = {lang: 30 for lang in languages}

        total_repos = 0
        language_counts = {}

        # 计算每个语言的进度权重
        progress_per_language = 90 / len(languages)  # 90%用于爬取，10%用于分析

        for i, language in enumerate(languages):
            limit = limits.get(language, 30)
            language_start_progress = i * progress_per_language

            logger.info(f"开始爬取 {keyword} - {language} 语言，限制 {limit} 个仓库")

            if task_id:
                update_task_status(conn, task_id, 'running',
                                 language_start_progress,
                                 f"正在爬取 {language} 项目...")

            # 搜索仓库
            repos = search_github_repositories(keyword, language, limit)
            language_counts[language] = len(repos)

            # 检查是否成功获取到仓库数据
            if len(repos) == 0:
                logger.warning(f"没有找到 {keyword} - {language} 的仓库数据，可能是网络问题")
                # 如果所有语言都没有数据，这可能是网络问题
                continue

            # 保存仓库数据
            for j, repo in enumerate(repos):
                repo_id = save_repository_to_db(conn, repo)
                if repo_id:
                    repo['db_id'] = repo_id

                    # 分析代码（可选）
                    if CodeAnalyzer:
                        analysis = analyze_repository_code(repo)
                        if analysis:
                            save_code_analysis_to_db(conn, analysis)

                # 每5个仓库更新一次进度
                if task_id and j % 5 == 0 and len(repos) > 0:
                    sub_progress_ratio = j / len(repos)
                    current_progress = language_start_progress + (sub_progress_ratio * progress_per_language)
                    max_current_language_progress = language_start_progress + progress_per_language
                    current_progress = min(current_progress, max_current_language_progress)

                    update_task_status(conn, task_id, 'running',
                                    current_progress,
                                    f"已处理 {j+1}/{len(repos)} 个 {language} 项目")

                # 延迟，避免请求过快
                time.sleep(REQUEST_DELAY)

            # 更新总数
            total_repos += len(repos)

        # 检查是否成功爬取到数据
        if total_repos == 0:
            logger.error(f"关键词 '{keyword}' 没有爬取到任何仓库数据，可能是网络连接问题")
            if task_id:
                update_task_status(conn, task_id, 'failed', 0,
                                 "没有爬取到任何数据，请检查网络连接或GitHub Token")
            return None

        logger.info(f"关键词 '{keyword}' 爬取完成，共保存 {total_repos} 个仓库")
        return language_counts

    except Exception as e:
        logger.error(f"爬取失败: {e}")
        logger.error(traceback.format_exc())

        if task_id:
            update_task_status(conn, task_id, 'failed', 0, f"爬取过程出错: {str(e)[:200]}")
        return None

def main():
    """主函数"""
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
        total_repos = 0
        success = True

        for keyword in keywords:
            logger.info(f"开始爬取关键词: {keyword}")
            result = crawl_by_keyword(keyword, conn, task_id, languages, limits)
            if result:
                # result 是语言计数字典
                total_repos += sum(result.values())
            else:
                success = False
                logger.error(f"关键词 '{keyword}' 爬取失败")

        # 爬虫完成，更新任务状态
        if task_id:
            if success:
                # 注意：这里设置为90%，为数据分析留出10%的进度空间
                update_task_status(conn, task_id, 'running', 90,
                                 f"爬取完成，共处理 {total_repos} 个项目，开始生成分析...",
                                 total_repos=total_repos)
            else:
                update_task_status(conn, task_id, 'failed', 0,
                                 f"部分关键词爬取失败，共处理 {total_repos} 个项目")

        logger.info(f"所有关键词爬取完成，共处理 {total_repos} 个仓库")

        # 生成分析JSON文件
        if success:
            logger.info("开始生成分析结果...")
            analysis_success = True
            for keyword in keywords:
                if not generate_analysis_json(conn, keyword, task_id):
                    analysis_success = False
                    logger.error(f"关键词 '{keyword}' 分析生成失败")

            # 更新最终任务状态
            if task_id:
                if analysis_success:
                    update_task_status(conn, task_id, 'completed', 100,
                                     f"分析完成，共处理 {total_repos} 个项目",
                                     total_repos=total_repos)
                    logger.info("所有分析结果生成完成")
                else:
                    update_task_status(conn, task_id, 'completed', 95,
                                     f"爬取完成但部分分析失败，共处理 {total_repos} 个项目",
                                     total_repos=total_repos)

        # 重要：正常退出，让API知道爬虫已完成
        if not success:
            sys.exit(1)  # 失败时退出码为1

    except Exception as e:
        logger.error(f"未处理的异常: {e}")
        logger.error(traceback.format_exc())
        if task_id:
            update_task_status(conn, task_id, 'failed', 0, f"未处理的异常: {str(e)[:200]}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
