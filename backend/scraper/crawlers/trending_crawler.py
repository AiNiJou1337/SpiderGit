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
                                     max_results: int = 100) -> List[Dict[str, Any]]:
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
        
        # 添加最小星数过滤（确保质量）
        query_parts.append('stars:>10')
        
        query = ' '.join(query_parts)
        
        try:
            # 使用搜索 API 获取趋势仓库
            search_result = self.api_client.search_repositories(
                query=query,
                sort='stars',
                order='desc',
                per_page=min(100, max_results),
                page=1
            )
            
            if not search_result or 'items' not in search_result:
                logger.warning("搜索结果为空")
                return []
            
            repositories = []
            for repo in search_result['items'][:max_results]:
                processed_repo = await self._process_repository(repo)
                if processed_repo:
                    repositories.append(processed_repo)
            
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
            'JavaScript', 'Python', 'Java', 'TypeScript', 'C++', 
            'C#', 'PHP', 'Go', 'Rust', 'Swift', 'Kotlin', 'Ruby'
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
