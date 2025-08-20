#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
GitHub 爬虫系统测试（重构后版本）
测试关键词爬虫的核心功能
"""

import pytest
import os
import sys
import asyncio
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 设置测试环境变量
os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_db'

try:
    from backend.scraper.core.token_manager import GitHubTokenManager
    from backend.scraper.core.api_client import GitHubAPIClient
    from backend.scraper.crawlers.keyword_scraper import KeywordScraper
    from backend.scraper.analyzers.code_analyzer import CodeAnalyzer
except ImportError as e:
    pytest.skip(f"无法导入模块: {e}", allow_module_level=True)


class TestGitHubTokenManager:
    """测试 GitHub Token 管理器"""

    def setup_method(self):
        """设置测试环境"""
        self.token_manager = GitHubTokenManager()

    def test_token_initialization(self):
        """测试 Token 初始化"""
        assert self.token_manager is not None
        assert hasattr(self.token_manager, 'tokens')
        assert hasattr(self.token_manager, 'current_token_index')

    @patch.dict(os.environ, {'GITHUB_TOKENS': 'token1,token2,token3'})
    def test_load_tokens_from_env(self):
        """测试从环境变量加载 Token"""
        token_manager = GitHubTokenManager()
        assert len(token_manager.tokens) >= 3

    def test_get_headers(self):
        """测试获取请求头"""
        headers = self.token_manager.get_headers()
        assert 'Authorization' in headers
        assert 'User-Agent' in headers
        assert headers['Authorization'].startswith('token ')

    @patch('requests.get')
    def test_check_rate_limit(self, mock_get):
        """测试速率限制检查"""
        # 模拟 API 响应
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resources': {
                'core': {
                    'limit': 5000,
                    'remaining': 4999,
                    'reset': 1234567890
                }
            }
        }
        mock_get.return_value = mock_response

        rate_limit = self.token_manager.check_rate_limit()
        assert rate_limit is not None
        assert 'remaining' in rate_limit
        assert 'limit' in rate_limit


class TestGitHubAPIClient:
    """测试 GitHub API 客户端"""

    def setup_method(self):
        """设置测试环境"""
        self.api_client = GitHubAPIClient()

    @patch('requests.Session.request')
    def test_make_request_success(self, mock_request):
        """测试成功的 API 请求"""
        # 模拟成功响应
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'test': 'data'}
        mock_request.return_value = mock_response

        result = self.api_client._make_request('GET', 'https://api.github.com/test')
        assert result is not None
        assert result.status_code == 200

    @patch('requests.Session.request')
    def test_make_request_rate_limit(self, mock_request):
        """测试速率限制处理"""
        # 模拟速率限制响应
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.text = 'rate limit exceeded'
        mock_request.return_value = mock_response

        result = self.api_client._make_request('GET', 'https://api.github.com/test')
        # 应该处理速率限制并返回响应
        assert result is not None

    def test_search_repositories(self):
        """测试仓库搜索"""
        with patch.object(self.api_client, 'get') as mock_get:
            mock_get.return_value = {
                'total_count': 1,
                'items': [{'name': 'test-repo'}]
            }

            result = self.api_client.search_repositories('python')
            assert result is not None
            assert 'items' in result
            assert len(result['items']) == 1

    def test_get_repository(self):
        """测试获取仓库详情"""
        with patch.object(self.api_client, 'get') as mock_get:
            mock_get.return_value = {
                'name': 'test-repo',
                'owner': {'login': 'test-user'}
            }

            result = self.api_client.get_repository('test-user', 'test-repo')
            assert result is not None
            assert result['name'] == 'test-repo'


class TestKeywordScraper:
    """测试关键词爬虫"""

    def setup_method(self):
        """设置测试环境"""
        self.scraper = KeywordScraper()

    @pytest.mark.asyncio
    async def test_search_repositories_by_keyword(self):
        """测试关键词搜索"""
        with patch.object(self.scraper.api_client, 'search_repositories') as mock_search:
            mock_search.return_value = {
                'items': [
                    {
                        'id': 1,
                        'name': 'test-repo',
                        'full_name': 'user/test-repo',
                        'owner': {'login': 'user'},
                        'description': 'Test repository',
                        'html_url': 'https://github.com/user/test-repo',
                        'language': 'Python',
                        'stargazers_count': 100,
                        'forks_count': 10,
                        'watchers_count': 50,
                        'size': 1000,
                        'created_at': '2023-01-01T00:00:00Z',
                        'updated_at': '2023-12-01T00:00:00Z',
                        'pushed_at': '2023-12-01T00:00:00Z'
                    }
                ]
            }

            repositories = await self.scraper.search_repositories_by_keyword('python', max_results=1)
            assert len(repositories) == 1
            assert repositories[0]['name'] == 'test-repo'
            assert repositories[0]['keyword'] == 'python'

    def test_process_repository_data(self):
        """测试仓库数据处理"""
        repo_data = {
            'id': 1,
            'name': 'test-repo',
            'full_name': 'user/test-repo',
            'owner': {'login': 'user'},
            'description': 'Test repository',
            'html_url': 'https://github.com/user/test-repo',
            'language': 'Python',
            'stargazers_count': 100,
            'forks_count': 10,
            'watchers_count': 50,
            'size': 1000,
            'created_at': '2023-01-01T00:00:00Z',
            'updated_at': '2023-12-01T00:00:00Z',
            'pushed_at': '2023-12-01T00:00:00Z'
        }

        processed = self.scraper._process_repository_data(repo_data, 'python')
        assert processed is not None
        assert processed['name'] == 'test-repo'
        assert processed['keyword'] == 'python'
        assert processed['owner'] == 'user'
        assert 'scraped_at' in processed

    def test_save_results(self):
        """测试保存结果"""
        test_results = [
            {'name': 'repo1', 'stars': 100},
            {'name': 'repo2', 'stars': 200}
        ]

        with patch('pathlib.Path.mkdir'), \
             patch('builtins.open', create=True) as mock_open:
            
            mock_file = MagicMock()
            mock_open.return_value.__enter__.return_value = mock_file

            result = self.scraper.save_results(test_results, 'python', 'test_output')
            assert result is True


class TestCodeAnalyzer:
    """测试代码分析器"""

    def setup_method(self):
        """设置测试环境"""
        self.analyzer = CodeAnalyzer()

    def test_analyze_python_file(self):
        """测试 Python 文件分析"""
        python_code = """
import os
import sys
from pathlib import Path
import requests

def main():
    print("Hello, World!")
"""
        
        result = self.analyzer.analyze_file('test.py', python_code)
        assert result is not None
        assert result['language'] == 'python'
        assert 'os' in result['imports']
        assert 'sys' in result['imports']
        assert 'pathlib' in result['imports']
        assert 'requests' in result['imports']

    def test_analyze_javascript_file(self):
        """测试 JavaScript 文件分析"""
        js_code = """
import React from 'react';
import { useState } from 'react';
const express = require('express');

function App() {
    return <div>Hello World</div>;
}
"""
        
        result = self.analyzer.analyze_file('test.js', js_code)
        assert result is not None
        assert result['language'] == 'javascript'
        assert 'react' in result['imports']
        assert 'express' in result['imports']

    def test_clean_import_name(self):
        """测试导入名称清理"""
        # Python 导入
        assert self.analyzer._clean_import_name('os.path', 'python') == 'os'
        assert self.analyzer._clean_import_name('requests.auth', 'python') == 'requests'
        
        # JavaScript 导入
        assert self.analyzer._clean_import_name('react', 'javascript') == 'react'
        assert self.analyzer._clean_import_name('@types/node', 'javascript') == '@types/node'
        assert self.analyzer._clean_import_name('./utils', 'javascript') is None

    def test_analyze_repository(self):
        """测试仓库分析"""
        test_repo_path = '/tmp/test_repo'
        
        with patch('os.path.exists', return_value=True), \
             patch('os.walk') as mock_walk:
            
            # 模拟文件结构
            mock_walk.return_value = [
                ('/tmp/test_repo', [], ['main.py', 'utils.js', 'README.md'])
            ]
            
            with patch.object(self.analyzer, 'analyze_file') as mock_analyze:
                mock_analyze.return_value = {
                    'language': 'python',
                    'imports': ['os', 'sys'],
                    'file_size': 100,
                    'line_count': 10
                }
                
                result = self.analyzer.analyze_repository(test_repo_path, max_files=10)
                assert result is not None
                assert 'languages' in result
                assert 'imports' in result
                assert result['file_count'] > 0


@pytest.mark.integration
class TestIntegration:
    """集成测试"""

    @pytest.mark.asyncio
    async def test_full_scraping_workflow(self):
        """测试完整的爬取工作流"""
        scraper = KeywordScraper()
        
        # 模拟 API 响应
        with patch.object(scraper.api_client, 'search_repositories') as mock_search, \
             patch.object(scraper.api_client, 'get_repository_languages') as mock_languages, \
             patch.object(scraper.api_client, 'get_repository_topics') as mock_topics:
            
            mock_search.return_value = {
                'items': [{
                    'id': 1,
                    'name': 'test-repo',
                    'full_name': 'user/test-repo',
                    'owner': {'login': 'user'},
                    'description': 'Test repository',
                    'html_url': 'https://github.com/user/test-repo',
                    'language': 'Python',
                    'stargazers_count': 100,
                    'forks_count': 10,
                    'watchers_count': 50,
                    'size': 1000,
                    'created_at': '2023-01-01T00:00:00Z',
                    'updated_at': '2023-12-01T00:00:00Z',
                    'pushed_at': '2023-12-01T00:00:00Z'
                }]
            }
            
            mock_languages.return_value = {'Python': 1000}
            mock_topics.return_value = ['python', 'web']
            
            repositories = await scraper.search_repositories_by_keyword('python', max_results=1)
            
            assert len(repositories) == 1
            assert repositories[0]['name'] == 'test-repo'
            assert 'languages' in repositories[0]
            assert 'topics' in repositories[0]


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
