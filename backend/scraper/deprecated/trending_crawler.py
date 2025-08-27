#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
趋势爬虫（重构后版本）
爬取 GitHub 趋势仓库数据
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class TrendingCrawler:
    """GitHub 趋势爬虫"""
    
    def __init__(self, api_client):
        self.api_client = api_client
        
    async def get_trending_repositories(self,
                                     period: str = 'daily',
                                     language: Optional[str] = None,
                                     max_results: int = 200) -> List[Dict[str, Any]]:
        """获取趋势仓库"""
        logger.info(f"开始获取 {period} 趋势仓库，语言: {language or '全部'}")
        
        # 构建搜索查询
        query_parts = []
        
        # 添加时间范围
        date_ranges = {
            'daily': 1,
            'weekly': 7,
            'monthly': 30
        }
        
        days = date_ranges.get(period, 1)
        since_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        query_parts.append(f'created:>{since_date}')
        
        # 添加语言过滤
        if language:
            query_parts.append(f'language:{language}')
        
        # 添加最小星数过滤（确保质量）- 降低门槛以获取更多数据
        query_parts.append('stars:>5')
        
        query = ' '.join(query_parts)
        
        try:
            repositories = []

            # 多页获取以增加数据量
            pages_to_fetch = min(3, (max_results + 99) // 100)  # 最多获取3页

            for page in range(1, pages_to_fetch + 1):
                search_result = self.api_client.search_repositories(
                    query=query,
                    sort='stars',
                    order='desc',
                    per_page=100,
                    page=page
                )

                if not search_result or 'items' not in search_result:
                    logger.warning(f"第{page}页搜索结果为空")
                    break

                for repo in search_result['items']:
                    if len(repositories) >= max_results:
                        break

                    processed_repo = await self._process_repository(repo)
                    if processed_repo:
                        repositories.append(processed_repo)

                # 避免触发速率限制
                if page < pages_to_fetch:
                    await asyncio.sleep(1)

            logger.info(f"成功获取 {len(repositories)} 个趋势仓库")
            return repositories
            
        except Exception as e:
            logger.error(f"获取趋势仓库失败: {e}")
            return []
    
    async def _process_repository(self, repo_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
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
                'scraped_at': datetime.now().isoformat()
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
                
                # 计算今日新增星数（模拟）
                processed['today_stars'] = max(0, processed['stargazers_count'] // 100)
                
            except Exception as e:
                logger.warning(f"获取仓库 {processed['full_name']} 额外信息失败: {e}")
            
            return processed
            
        except Exception as e:
            logger.error(f"处理仓库数据失败: {e}")
            return None
    
    async def get_language_trending(self, language: str, period: str = 'daily') -> List[Dict[str, Any]]:
        """获取特定语言的趋势仓库"""
        return await self.get_trending_repositories(period=period, language=language)
    
    async def get_all_languages_trending(self, period: str = 'daily') -> Dict[str, List[Dict[str, Any]]]:
        """获取所有主要语言的趋势仓库"""
        languages = [
            # 主流语言
            'JavaScript', 'Python', 'Java', 'TypeScript', 'C++', 'C#', 'PHP', 'Go', 'Rust',
            'Swift', 'Kotlin', 'Ruby', 'C', 'Scala', 'Dart', 'R', 'MATLAB', 'Perl',

            # Web技术
            'HTML', 'CSS', 'Vue', 'Svelte',

            # 新兴语言
            'Zig', 'Julia', 'Crystal', 'Nim', 'V', 'Elixir', 'Erlang', 'Haskell', 'F#',

            # 系统和嵌入式
            'Assembly', 'Verilog', 'VHDL',

            # 脚本和配置
            'Shell', 'PowerShell', 'Lua', 'Tcl',

            # 数据科学
            'Jupyter Notebook', 'SQL',

            # 移动开发
            'Objective-C', 'Objective-C++',

            # 函数式编程
            'Clojure', 'Lisp', 'Scheme', 'OCaml', 'Reason', 'ReScript',

            # 其他
            'Groovy', 'CoffeeScript', 'LiveScript', 'PureScript', 'Elm'
        ]
        
        results = {}
        
        for language in languages:
            try:
                repos = await self.get_language_trending(language, period)
                results[language] = repos
                logger.info(f"获取 {language} 趋势仓库: {len(repos)} 个")
                
                # 避免触发速率限制
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"获取 {language} 趋势仓库失败: {e}")
                results[language] = []
        
        return results

    async def get_comprehensive_trending(self, period: str = 'daily') -> List[Dict[str, Any]]:
        """获取综合趋势数据，包含多种排序方式和筛选条件"""
        logger.info(f"开始获取 {period} 综合趋势数据")

        all_repositories = []

        # 1. 获取按星数排序的趋势仓库
        star_trending = await self.get_trending_repositories(
            period=period,
            max_results=100
        )
        all_repositories.extend(star_trending)

        # 2. 获取按Fork数排序的趋势仓库
        await asyncio.sleep(2)  # 避免速率限制
        fork_trending = await self._get_trending_by_forks(period, max_results=50)
        all_repositories.extend(fork_trending)

        # 3. 获取最近更新的活跃项目
        await asyncio.sleep(2)
        recent_trending = await self._get_recently_updated_trending(period, max_results=50)
        all_repositories.extend(recent_trending)

        # 去重（基于full_name）
        seen = set()
        unique_repositories = []
        for repo in all_repositories:
            if repo['full_name'] not in seen:
                seen.add(repo['full_name'])
                unique_repositories.append(repo)

        logger.info(f"获取到 {len(unique_repositories)} 个去重后的趋势仓库")
        return unique_repositories

    async def _get_trending_by_forks(self, period: str, max_results: int = 50) -> List[Dict[str, Any]]:
        """获取按Fork数排序的趋势仓库"""
        date_ranges = {'daily': 1, 'weekly': 7, 'monthly': 30}
        days = date_ranges.get(period, 1)
        since_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

        query = f'created:>{since_date} stars:>5 forks:>2'

        try:
            search_result = self.api_client.search_repositories(
                query=query,
                sort='forks',
                order='desc',
                per_page=max_results,
                page=1
            )

            if not search_result or 'items' not in search_result:
                return []

            repositories = []
            for repo in search_result['items']:
                processed_repo = await self._process_repository(repo)
                if processed_repo:
                    repositories.append(processed_repo)

            return repositories

        except Exception as e:
            logger.error(f"获取Fork趋势仓库失败: {e}")
            return []

    async def _get_recently_updated_trending(self, period: str, max_results: int = 50) -> List[Dict[str, Any]]:
        """获取最近更新的活跃项目"""
        date_ranges = {'daily': 1, 'weekly': 7, 'monthly': 30}
        days = date_ranges.get(period, 1)
        since_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

        query = f'pushed:>{since_date} stars:>10'

        try:
            search_result = self.api_client.search_repositories(
                query=query,
                sort='updated',
                order='desc',
                per_page=max_results,
                page=1
            )

            if not search_result or 'items' not in search_result:
                return []

            repositories = []
            for repo in search_result['items']:
                processed_repo = await self._process_repository(repo)
                if processed_repo:
                    repositories.append(processed_repo)

            return repositories

        except Exception as e:
            logger.error(f"获取最近更新趋势仓库失败: {e}")
            return []
