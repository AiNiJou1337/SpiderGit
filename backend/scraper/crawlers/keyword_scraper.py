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

from backend.scraper.core.api_client import GitHubAPIClient
from backend.scraper.analyzers.code_analyzer import CodeAnalyzer

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
        # 导入数据库连接和爬取函数
        from scraper.keyword_scraper import get_db_connection, crawl_by_keyword, update_task_status

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

    except ImportError as e:
        logger.error(f"无法导入必要的模块: {e}")
        logger.error(f"项目根目录: {project_root}")
        logger.error(f"Python路径: {sys.path}")
        sys.exit(1)

if __name__ == "__main__":
    main()
