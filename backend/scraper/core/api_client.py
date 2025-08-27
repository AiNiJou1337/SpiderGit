#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
GitHub API 客户端（重构后版本）
提供统一的 GitHub API 访问接口
"""

import time
import logging
import requests
from typing import Dict, Any, Optional, List
from .token_manager import GitHubTokenManager

logger = logging.getLogger(__name__)

class GitHubAPIClient:
    """GitHub API 客户端"""
    
    def __init__(self):
        self.token_manager = GitHubTokenManager()
        self.base_url = 'https://api.github.com'
        self.session = requests.Session()

        # 禁用代理（如果环境中有代理配置但不可用）
        self.session.trust_env = False
        self.session.proxies = {}
        
    def _make_request(self, method: str, url: str, **kwargs) -> Optional[requests.Response]:
        """发送 API 请求"""
        headers = self.token_manager.get_headers()
        headers.update(kwargs.pop('headers', {}))
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    timeout=30,
                    **kwargs
                )
                
                # 处理速率限制
                if response.status_code == 403 and 'rate limit' in response.text.lower():
                    logger.warning("遇到速率限制，尝试轮换 Token")
                    
                    # 尝试轮换 Token
                    new_token = self.token_manager._rotate_token()
                    if new_token:
                        headers = self.token_manager.get_headers()
                        continue
                    else:
                        logger.warning("所有 Token 都已达到限制，等待重置")
                        self.token_manager.wait_for_reset()
                        headers = self.token_manager.get_headers()
                        continue
                
                # 处理其他错误
                if response.status_code >= 400:
                    logger.error(f"API 请求失败: {response.status_code} - {response.text[:200]}")
                    if attempt == max_retries - 1:
                        return response
                    time.sleep(2 ** attempt)  # 指数退避
                    continue
                
                return response
                
            except requests.exceptions.RequestException as e:
                logger.error(f"请求异常 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    return None
                time.sleep(2 ** attempt)
        
        return None
    
    def get(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict[str, Any]]:
        """GET 请求"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        response = self._make_request('GET', url, params=params)
        
        if response and response.status_code == 200:
            try:
                return response.json()
            except ValueError as e:
                logger.error(f"JSON 解析失败: {e}")
                return None
        
        return None
    
    def search_repositories(self, query: str, sort: str = 'stars', order: str = 'desc', 
                          per_page: int = 100, page: int = 1) -> Optional[Dict[str, Any]]:
        """搜索仓库"""
        params = {
            'q': query,
            'sort': sort,
            'order': order,
            'per_page': per_page,
            'page': page
        }
        
        return self.get('search/repositories', params)
    
    def get_repository(self, owner: str, repo: str) -> Optional[Dict[str, Any]]:
        """获取仓库详情"""
        return self.get(f'repos/{owner}/{repo}')
    
    def get_repository_contents(self, owner: str, repo: str, path: str = '') -> Optional[List[Dict[str, Any]]]:
        """获取仓库内容"""
        result = self.get(f'repos/{owner}/{repo}/contents/{path}')
        
        if isinstance(result, list):
            return result
        elif isinstance(result, dict):
            return [result]
        
        return None
    
    def get_repository_readme(self, owner: str, repo: str) -> Optional[str]:
        """获取仓库 README"""
        readme_data = self.get(f'repos/{owner}/{repo}/readme')
        
        if readme_data and 'content' in readme_data:
            import base64
            try:
                content = base64.b64decode(readme_data['content']).decode('utf-8')
                return content
            except Exception as e:
                logger.error(f"解码 README 失败: {e}")
        
        return None
    
    def get_repository_languages(self, owner: str, repo: str) -> Optional[Dict[str, int]]:
        """获取仓库语言统计"""
        return self.get(f'repos/{owner}/{repo}/languages')
    
    def get_repository_topics(self, owner: str, repo: str) -> Optional[List[str]]:
        """获取仓库主题"""
        headers = {'Accept': 'application/vnd.github.mercy-preview+json'}
        url = f"{self.base_url}/repos/{owner}/{repo}/topics"
        
        response = self._make_request('GET', url, headers=headers)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                return data.get('names', [])
            except ValueError:
                return None
        
        return None
    
    def get_trending_repositories(self, language: str = '', since: str = 'daily') -> List[Dict[str, Any]]:
        """获取趋势仓库（通过搜索 API 模拟）"""
        # 构建搜索查询
        date_ranges = {
            'daily': '1',
            'weekly': '7', 
            'monthly': '30'
        }
        
        days = date_ranges.get(since, '1')
        query = f'created:>{days}days'
        
        if language:
            query += f' language:{language}'
        
        result = self.search_repositories(
            query=query,
            sort='stars',
            order='desc',
            per_page=100
        )
        
        if result and 'items' in result:
            return result['items']
        
        return []
    
    def get_rate_limit_status(self) -> Optional[Dict[str, Any]]:
        """获取速率限制状态"""
        return self.get('rate_limit')

    def get_rate_limit(self) -> Optional[Dict[str, Any]]:
        """获取速率限制状态（别名方法）"""
        return self.get_rate_limit_status()
    
    def test_connection(self) -> bool:
        """测试连接"""
        try:
            result = self.get_rate_limit_status()
            return result is not None
        except Exception as e:
            logger.error(f"连接测试失败: {e}")
            return False
