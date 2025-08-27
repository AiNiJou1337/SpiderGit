#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
关键词爬虫（重构后版本）
基于关键词搜索 GitHub 仓库并分析
"""

import os
import sys
import time
import json
import random
import argparse
import requests
import datetime
import traceback
import re
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from urllib.parse import quote_plus

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# 加载环境变量
try:
    from dotenv import load_dotenv
    env_path = project_root / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"[SUCCESS] 已加载环境变量文件: {env_path}")
    else:
        print(f"⚠️ 未找到.env文件: {env_path}")
except ImportError:
    print("[WARNING] python-dotenv未安装，尝试手动加载.env文件")
    # 手动加载.env文件
    env_path = project_root / '.env'
    if env_path.exists():
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if key and value:
                            os.environ[key] = value
            print(f"✅ 手动加载环境变量文件: {env_path}")
        except Exception as e:
            print(f"❌ 加载.env文件失败: {e}")

from backend.scraper.core.api_client import GitHubAPIClient
from backend.scraper.analyzers.code_analyzer import CodeAnalyzer
from backend.scraper.analyzers.data_analysis import GitHubDataAnalyzer

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('keyword_scraper.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# 数据库相关导入
try:
    import psycopg2
    import psycopg2.extras
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False
    logger.warning("psycopg2 未安装，将使用模拟模式")

class KeywordScraper:
    """关键词爬虫类"""
    
    def __init__(self):
        self.api_client = GitHubAPIClient()
        self.code_analyzer = CodeAnalyzer()
        self.session = requests.Session()
        
        # 设置请求头
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
    async def search_repositories_by_keyword(self, keyword: str, max_results: int = 100) -> List[Dict[str, Any]]:
        """根据关键词搜索仓库"""
        logger.info(f"开始搜索关键词: {keyword}")
        
        repositories = []
        page = 1
        per_page = min(100, max_results)
        
        while len(repositories) < max_results:
            try:
                # 使用 GitHub API 搜索
                search_result = self.api_client.search_repositories(
                    query=keyword,
                    sort='stars',
                    order='desc',
                    per_page=per_page,
                    page=page
                )
                
                if not search_result or 'items' not in search_result:
                    logger.warning(f"搜索结果为空: {keyword}")
                    break
                
                items = search_result['items']
                if not items:
                    logger.info(f"第 {page} 页无更多结果")
                    break
                
                for repo in items:
                    if len(repositories) >= max_results:
                        break
                        
                    # 处理仓库数据
                    processed_repo = self._process_repository_data(repo, keyword)
                    if processed_repo:
                        repositories.append(processed_repo)
                
                logger.info(f"已获取 {len(repositories)} 个仓库 (第 {page} 页)")
                page += 1
                
                # 避免触发速率限制
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"搜索第 {page} 页时出错: {e}")
                break
        
        logger.info(f"关键词 '{keyword}' 搜索完成，共获取 {len(repositories)} 个仓库")
        return repositories
    
    def _process_repository_data(self, repo_data: Dict[str, Any], keyword: str) -> Optional[Dict[str, Any]]:
        """处理仓库数据"""
        try:
            # 基本信息
            processed = {
                'id': repo_data.get('id'),
                'name': repo_data.get('name'),
                'full_name': repo_data.get('full_name'),
                'owner': repo_data.get('owner', {}).get('login'),
                'description': repo_data.get('description'),
                'html_url': repo_data.get('html_url'),
                'language': repo_data.get('language'),
                'stargazers_count': repo_data.get('stargazers_count', 0),
                'forks_count': repo_data.get('forks_count', 0),
                'watchers_count': repo_data.get('watchers_count', 0),
                'size': repo_data.get('size', 0),
                'created_at': repo_data.get('created_at'),
                'updated_at': repo_data.get('updated_at'),
                'pushed_at': repo_data.get('pushed_at'),
                'keyword': keyword,
                'scraped_at': datetime.datetime.now().isoformat()
            }
            
            # 获取额外信息
            try:
                # 获取语言统计
                languages = self.api_client.get_repository_languages(
                    processed['owner'], 
                    processed['name']
                )
                processed['languages'] = languages
                
                # 获取主题标签
                topics = self.api_client.get_repository_topics(
                    processed['owner'], 
                    processed['name']
                )
                processed['topics'] = topics
                
            except Exception as e:
                logger.warning(f"获取仓库 {processed['full_name']} 额外信息失败: {e}")
            
            return processed
            
        except Exception as e:
            logger.error(f"处理仓库数据失败: {e}")
            return None
    
    async def analyze_repository_code(self, repo_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """分析仓库代码"""
        try:
            owner = repo_data['owner']
            name = repo_data['name']
            
            logger.info(f"开始分析仓库代码: {owner}/{name}")
            
            # 获取仓库内容
            contents = self.api_client.get_repository_contents(owner, name)
            
            if not contents:
                logger.warning(f"无法获取仓库内容: {owner}/{name}")
                return None
            
            # 分析代码结构
            analysis_result = {
                'repository': repo_data,
                'file_analysis': [],
                'language_stats': {},
                'import_analysis': {},
                'analyzed_at': datetime.datetime.now().isoformat()
            }
            
            # 分析文件
            analyzed_files = 0
            max_files = 20  # 限制分析文件数量
            
            for content in contents[:max_files]:
                if content.get('type') == 'file':
                    file_analysis = await self._analyze_file(owner, name, content)
                    if file_analysis:
                        analysis_result['file_analysis'].append(file_analysis)
                        analyzed_files += 1
            
            logger.info(f"仓库 {owner}/{name} 代码分析完成，分析了 {analyzed_files} 个文件")
            return analysis_result
            
        except Exception as e:
            logger.error(f"分析仓库代码失败: {e}")
            return None
    
    async def _analyze_file(self, owner: str, name: str, file_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """分析单个文件"""
        try:
            file_path = file_info.get('path', '')
            file_name = file_info.get('name', '')
            
            # 只分析代码文件
            code_extensions = ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb']
            if not any(file_name.endswith(ext) for ext in code_extensions):
                return None
            
            # 获取文件内容
            file_content = self.api_client.get_repository_contents(owner, name, file_path)
            
            if not file_content or isinstance(file_content, list):
                return None
            
            # 解码文件内容
            import base64
            try:
                content = base64.b64decode(file_content['content']).decode('utf-8')
            except Exception:
                return None
            
            # 使用代码分析器分析
            analysis = self.code_analyzer.analyze_file(file_path, content)
            
            if analysis:
                return {
                    'file_path': file_path,
                    'file_name': file_name,
                    'language': analysis['language'],
                    'imports': analysis['imports'],
                    'file_size': analysis['file_size'],
                    'line_count': analysis['line_count']
                }
            
            return None
            
        except Exception as e:
            logger.error(f"分析文件失败: {e}")
            return None
    
    def save_results(self, results: List[Dict[str, Any]], keyword: str, output_dir: str = 'results') -> bool:
        """保存搜索结果"""
        try:
            # 创建输出目录
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            # 生成文件名
            timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{keyword}_{timestamp}.json"
            filepath = output_path / filename
            
            # 保存数据
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            
            logger.info(f"结果已保存到: {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"保存结果失败: {e}")
            return False

    async def crawl_keyword(self, keyword: str, languages: List[str] = None, limits: Dict[str, int] = None, task_id: int = None) -> Dict[str, Any]:
        """爬取指定关键词的仓库"""
        try:
            logger.info(f"开始爬取关键词: {keyword}")

            # 确保关键词在数据库中存在
            self._ensure_keyword_exists(keyword)

            # 更新任务状态
            if task_id:
                self.update_task_status(task_id, 'running', 10, f"开始搜索关键词: {keyword}")

            # 确定搜索参数
            max_results = 100
            if limits:
                # 计算总的最大结果数
                max_results = sum(limits.values()) if limits else 100

            # 搜索仓库
            repositories = []

            # 如果指定了语言，按语言搜索
            if languages:
                for lang in languages:
                    lang_limit = limits.get(lang.lower(), 20) if limits else 20
                    lang_query = f"{keyword} language:{lang}"

                    logger.info(f"搜索语言 {lang} 的仓库，限制 {lang_limit} 个")

                    try:
                        lang_repos = self._search_repositories_sync(lang_query, lang_limit)
                        repositories.extend(lang_repos)

                        if task_id:
                            progress = 10 + (len(repositories) / max_results) * 60
                            self.update_task_status(task_id, 'running', int(progress),
                                                  f"已搜索到 {len(repositories)} 个仓库")

                        # 避免API限制
                        time.sleep(2)

                    except Exception as e:
                        logger.error(f"搜索语言 {lang} 失败: {e}")
            else:
                # 通用搜索
                repositories = self._search_repositories_sync(keyword, max_results)

            # 处理结果
            processed_repos = []
            for i, repo in enumerate(repositories):
                processed = self._process_repository_data(repo, keyword)
                if processed:
                    processed_repos.append(processed)

            # 先保存基本仓库数据到数据库
            if DB_AVAILABLE and task_id:
                try:
                    self._save_to_database(processed_repos, keyword, task_id)
                    logger.info(f"已保存 {len(processed_repos)} 个仓库到数据库")
                except Exception as e:
                    logger.error(f"保存到数据库失败: {e}")

            # 然后进行代码分析（限制前几个仓库以避免API限制）
            for i, processed in enumerate(processed_repos[:2]):  # 只分析前2个仓库
                try:
                    logger.info(f"开始分析仓库代码: {processed['full_name']}")
                    code_analysis = await self.analyze_repository_code(processed)
                    if code_analysis:
                        # 只保存简化的分析结果，避免循环引用
                        processed['code_analysis_summary'] = {
                            'analyzed_files': len(code_analysis.get('file_analysis', [])),
                            'languages_found': list(code_analysis.get('language_stats', {}).keys()),
                            'analyzed_at': code_analysis.get('analyzed_at')
                        }
                        # 保存代码文件数据到数据库
                        if DB_AVAILABLE:
                            self._save_code_analysis_to_db(processed, code_analysis)
                except Exception as e:
                    logger.warning(f"代码分析失败 {processed['full_name']}: {e}")

                # 更新进度
                if task_id:
                    progress = 70 + ((i + 1) / len(processed_repos)) * 20
                    self.update_task_status(task_id, 'running', int(progress),
                                          f"已分析 {i+1}/{len(processed_repos)} 个仓库")

            # 保存到文件
            self.save_results(processed_repos, keyword)

            # 生成分析文件
            self._generate_analysis_file(processed_repos, keyword)

            result = {
                'keyword': keyword,
                'total_repositories': len(processed_repos),
                'repositories': processed_repos,
                'scraped_at': datetime.datetime.now().isoformat()
            }

            logger.info(f"关键词 '{keyword}' 爬取完成，共获取 {len(processed_repos)} 个仓库")
            return result

        except Exception as e:
            logger.error(f"爬取关键词 '{keyword}' 失败: {e}")
            if task_id:
                self.update_task_status(task_id, 'failed', 0, f"爬取失败: {str(e)[:200]}")
            return None

    def _search_repositories_sync(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """同步搜索仓库"""
        repositories = []
        page = 1
        per_page = min(100, max_results)

        while len(repositories) < max_results:
            try:
                search_result = self.api_client.search_repositories(
                    query=query,
                    sort='stars',
                    order='desc',
                    per_page=per_page,
                    page=page
                )

                if not search_result or 'items' not in search_result:
                    break

                items = search_result['items']
                if not items:
                    break

                repositories.extend(items)

                if len(items) < per_page:
                    break

                page += 1
                time.sleep(1)  # 避免API限制

            except Exception as e:
                logger.error(f"搜索第 {page} 页时出错: {e}")
                break

        return repositories[:max_results]

    def _ensure_keyword_exists(self, keyword: str):
        """确保关键词在数据库中存在"""
        if not DB_AVAILABLE:
            logger.info(f"数据库不可用，跳过关键词 '{keyword}' 的数据库操作")
            return

        try:
            conn = self._get_db_connection()
            if not conn:
                return

            cursor = conn.cursor()

            # 检查关键词是否存在
            cursor.execute('SELECT id FROM keywords WHERE text = %s', (keyword,))
            existing = cursor.fetchone()

            if not existing:
                # 插入新关键词
                cursor.execute('''
                    INSERT INTO keywords (text, created_at)
                    VALUES (%s, %s)
                    RETURNING id
                ''', (keyword, datetime.datetime.now()))

                keyword_id = cursor.fetchone()[0]
                logger.info(f"已添加新关键词到数据库: '{keyword}' (ID: {keyword_id})")
            else:
                logger.info(f"关键词 '{keyword}' 已存在于数据库中")

            conn.commit()
            cursor.close()
            conn.close()

        except Exception as e:
            logger.error(f"确保关键词存在时出错: {e}")
            if conn:
                conn.rollback()
                conn.close()

    def _generate_analysis_file(self, repositories: List[Dict[str, Any]], keyword: str):
        """生成分析文件"""
        try:
            logger.info(f"开始生成关键词 '{keyword}' 的分析文件...")

            # 创建临时数据文件
            temp_file = f"temp_analysis_{keyword.replace(' ', '_')}.json"
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(repositories, f, ensure_ascii=False, indent=2)

            # 创建分析器
            analyzer = GitHubDataAnalyzer()
            analyzer.keyword = keyword

            # 加载数据
            if not analyzer.load_data_from_json(temp_file):
                logger.error(f"加载临时数据文件失败: {temp_file}")
                return

            # 生成分析报告
            analyzer.generate_summary_report()

            # 确保analytics目录存在
            analytics_dir = project_root / 'public' / 'analytics'
            analytics_dir.mkdir(parents=True, exist_ok=True)

            # 生成输出文件名（与现有格式一致）
            keyword_filename = keyword.replace(' ', '_').replace('-', '_')
            output_file = analytics_dir / f"analysis_{keyword_filename}.json"

            # 保存分析结果
            if analyzer.save_analysis(str(output_file)):
                logger.info(f"分析文件已生成: {output_file}")
            else:
                logger.error(f"保存分析文件失败: {output_file}")

            # 清理临时文件
            if os.path.exists(temp_file):
                os.remove(temp_file)

        except Exception as e:
            logger.error(f"生成分析文件失败: {e}")
            logger.error(traceback.format_exc())

    def _save_code_analysis_to_db(self, repo_data: Dict[str, Any], code_analysis: Dict[str, Any]):
        """保存代码分析数据到数据库"""
        if not DB_AVAILABLE:
            return

        try:
            conn = self._get_db_connection()
            if not conn:
                return

            cursor = conn.cursor()

            # 查找仓库ID
            cursor.execute('SELECT id FROM repositories WHERE full_name = %s', (repo_data['full_name'],))
            repo_record = cursor.fetchone()

            if not repo_record:
                logger.warning(f"未找到仓库记录: {repo_data['full_name']}")
                return

            repo_id = repo_record[0]

            # 保存代码文件分析数据
            for file_analysis in code_analysis.get('file_analysis', []):
                try:
                    # 提取库和包信息
                    imported_libraries = file_analysis.get('imports', [])
                    packages = []  # 暂时为空，可以后续扩展
                    functions = []  # 暂时为空，可以后续扩展

                    # 插入代码文件记录
                    cursor.execute('''
                        INSERT INTO code_files
                        (filename, path, repository_id, "importedLibraries", packages, functions, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (repository_id, path) DO UPDATE SET
                        "importedLibraries" = EXCLUDED."importedLibraries",
                        packages = EXCLUDED.packages,
                        functions = EXCLUDED.functions,
                        updated_at = EXCLUDED.updated_at
                    ''', (
                        file_analysis.get('filename', ''),
                        file_analysis.get('path', ''),
                        repo_id,
                        imported_libraries,
                        packages,
                        functions,
                        datetime.datetime.now(),
                        datetime.datetime.now()
                    ))

                except Exception as e:
                    logger.warning(f"保存文件分析数据失败: {e}")
                    continue

            conn.commit()
            cursor.close()
            conn.close()

            logger.info(f"已保存仓库 {repo_data['full_name']} 的代码分析数据")

        except Exception as e:
            logger.error(f"保存代码分析数据失败: {e}")
            if conn:
                conn.rollback()
                conn.close()

    def update_task_status(self, task_id: int, status: str, progress: int, message: str = None, total_repositories: int = None):
        """更新任务状态"""
        if not DB_AVAILABLE:
            logger.info(f"任务 {task_id} 状态更新: {status} ({progress}%) - {message}")
            return

        try:
            conn = self._get_db_connection()
            if not conn:
                return

            cursor = conn.cursor()

            update_data = {
                'status': status,
                'progress': progress,
                'message': message or '',
                'updated_at': datetime.datetime.now()
            }

            if status in ['completed', 'failed']:
                update_data['completed_at'] = datetime.datetime.now()

            # 根据数据库schema，只更新存在的字段
            if status in ['completed', 'failed']:
                if total_repositories is not None:
                    cursor.execute('''
                        UPDATE crawl_tasks
                        SET status = %(status)s,
                            progress = %(progress)s,
                            message = %(message)s,
                            completed_at = %(completed_at)s,
                            total_repositories = %(total_repositories)s
                        WHERE id = %(task_id)s
                    ''', {
                        'status': status,
                        'progress': progress,
                        'message': message or '',
                        'completed_at': update_data.get('completed_at'),
                        'total_repositories': total_repositories,
                        'task_id': task_id
                    })
                else:
                    cursor.execute('''
                        UPDATE crawl_tasks
                        SET status = %(status)s,
                            progress = %(progress)s,
                            message = %(message)s,
                            completed_at = %(completed_at)s
                        WHERE id = %(task_id)s
                    ''', {
                        'status': status,
                        'progress': progress,
                        'message': message or '',
                        'completed_at': update_data.get('completed_at'),
                        'task_id': task_id
                    })
            else:
                cursor.execute('''
                    UPDATE crawl_tasks
                    SET status = %(status)s,
                        progress = %(progress)s,
                        message = %(message)s
                    WHERE id = %(task_id)s
                ''', {
                    'status': status,
                    'progress': progress,
                    'message': message or '',
                    'task_id': task_id
                })

            conn.commit()
            cursor.close()
            conn.close()

            logger.info(f"任务 {task_id} 状态已更新: {status} ({progress}%)")

        except Exception as e:
            logger.error(f"更新任务状态失败: {e}")

    def _get_db_connection(self):
        """获取数据库连接"""
        if not DB_AVAILABLE:
            return None

        try:
            db_url = os.getenv('DATABASE_URL')
            if not db_url:
                logger.warning("DATABASE_URL 环境变量未设置")
                return None

            conn = psycopg2.connect(db_url)
            return conn

        except Exception as e:
            logger.error(f"数据库连接失败: {e}")
            return None

    def _save_to_database(self, repositories: List[Dict[str, Any]], keyword: str, task_id: int):
        """保存仓库数据到数据库"""
        if not DB_AVAILABLE:
            return

        try:
            conn = self._get_db_connection()
            if not conn:
                return

            cursor = conn.cursor()

            # 确保关键词存在（使用正确的字段名）
            cursor.execute('SELECT id FROM keywords WHERE text = %s', (keyword,))
            keyword_record = cursor.fetchone()

            if not keyword_record:
                cursor.execute('INSERT INTO keywords (text, created_at) VALUES (%s, %s) RETURNING id',
                             (keyword, datetime.datetime.now()))
                keyword_id = cursor.fetchone()[0]
            else:
                keyword_id = keyword_record[0]

            # 保存仓库数据
            for repo in repositories:
                try:
                    # 检查仓库是否已存在（使用正确的字段名）
                    cursor.execute('SELECT id FROM repositories WHERE full_name = %s', (repo['full_name'],))
                    existing = cursor.fetchone()

                    if existing:
                        repo_id = existing[0]
                        # 更新仓库信息（使用正确的字段名）
                        cursor.execute('''
                            UPDATE repositories
                            SET name = %s, description = %s, language = %s,
                                stars = %s, forks = %s, url = %s, updated_at = %s
                            WHERE id = %s
                        ''', (
                            repo['name'], repo['description'], repo['language'],
                            repo['stargazers_count'], repo['forks_count'], repo['html_url'],
                            datetime.datetime.now(), repo_id
                        ))
                    else:
                        # 插入新仓库（使用正确的字段名）
                        cursor.execute('''
                            INSERT INTO repositories
                            (name, full_name, description, language, stars, forks, url, created_at, updated_at, owner, trending, trend_date, trend_period)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            RETURNING id
                        ''', (
                            repo['name'], repo['full_name'], repo['description'], repo['language'],
                            repo['stargazers_count'], repo['forks_count'], repo['html_url'],
                            datetime.datetime.now(), datetime.datetime.now(), repo['owner'],
                            False, datetime.datetime.now(), 'keyword_search'
                        ))
                        repo_id = cursor.fetchone()[0]

                    # 关联关键词和仓库（使用双引号包围字段名）
                    cursor.execute('''
                        INSERT INTO repository_keywords ("repositoryId", "keywordId", created_at)
                        VALUES (%s, %s, %s)
                        ON CONFLICT ("repositoryId", "keywordId") DO NOTHING
                    ''', (repo_id, keyword_id, datetime.datetime.now()))

                except Exception as e:
                    logger.error(f"保存仓库 {repo.get('full_name', 'unknown')} 失败: {e}")
                    continue

            # 更新任务的仓库总数
            cursor.execute('''
                UPDATE crawl_tasks
                SET total_repositories = %s
                WHERE id = %s
            ''', (len(repositories), task_id))

            conn.commit()
            cursor.close()
            conn.close()

            logger.info(f"已保存 {len(repositories)} 个仓库到数据库，并更新任务仓库总数")

        except Exception as e:
            logger.error(f"保存到数据库失败: {e}")

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='GitHub 关键词爬虫')
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

    # 添加项目根目录到Python路径
    import sys
    from pathlib import Path

    # 获取项目根目录
    project_root = Path(__file__).parent.parent.parent.parent
    sys.path.insert(0, str(project_root))

    try:
        # 创建爬虫实例
        scraper = KeywordScraper()

        # 执行爬取任务
        success = True
        total_repos = 0

        # 使用asyncio运行异步任务
        import asyncio

        async def run_crawling():
            nonlocal success, total_repos
            for keyword in keywords:
                logger.info(f"开始爬取关键词: {keyword}")
                try:
                    result = await scraper.crawl_keyword(keyword, languages, limits, task_id)
                    if result:
                        total_repos += result.get('total_repositories', 0)
                        logger.info(f"关键词 '{keyword}' 爬取完成，获得 {result.get('total_repositories', 0)} 个仓库")
                    else:
                        success = False
                        logger.error(f"关键词 '{keyword}' 爬取失败")
                except Exception as e:
                    logger.error(f"爬取关键词 '{keyword}' 时发生异常: {e}")
                    logger.error(traceback.format_exc())
                    success = False

        # 运行异步任务
        asyncio.run(run_crawling())

        # 更新最终状态
        if task_id:
            if success:
                scraper.update_task_status(task_id, 'completed', 100, f"爬取完成，共处理 {total_repos} 个仓库", total_repos)
            else:
                scraper.update_task_status(task_id, 'failed', 0, f"爬取失败，共处理 {total_repos} 个仓库", total_repos)

        logger.info(f"所有关键词爬取完成，总共处理 {total_repos} 个仓库")

    except Exception as e:
        logger.error(f"爬虫执行失败: {e}")
        logger.error(traceback.format_exc())
        if task_id:
            try:
                scraper = KeywordScraper()
                scraper.update_task_status(task_id, 'failed', 0, f"爬虫执行失败: {str(e)[:200]}")
            except:
                pass
        sys.exit(1)

if __name__ == "__main__":
    main()
