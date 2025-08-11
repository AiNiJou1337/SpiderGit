#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
GitHub 爬虫系统测试
测试 keyword_scraper.py 的核心功能
"""

import pytest
import os
import sys
import time
from unittest.mock import Mock, patch, MagicMock
import requests

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# 设置测试环境变量
os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_db'

try:
    from keyword_scraper import GitHubTokenManager, github_api_request
except ImportError as e:
    pytest.skip(f"无法导入 keyword_scraper: {e}", allow_module_level=True)


class TestGitHubTokenManager:
    """测试 GitHub Token 管理器的核心功能"""

    def setup_method(self):
        """每个测试方法前的设置"""
        # 清除所有 GitHub Token 环境变量
        for key in list(os.environ.keys()):
            if key.startswith('GITHUB_TOKEN_'):
                del os.environ[key]

    def test_no_tokens_initialization(self):
        """测试无 Token 时的初始化行为"""
        with patch('keyword_scraper.logger') as mock_logger:
            manager = GitHubTokenManager()

            assert len(manager.tokens) == 0
            assert manager.get_available_token() is None
            mock_logger.warning.assert_called_with("未发现任何 GitHub Token，将使用无认证模式")

    @patch.dict(os.environ, {
        'GITHUB_TOKEN_MAIN': 'ghp_test_main_token',
        'GITHUB_TOKEN_BACKUP': 'ghp_test_backup_token'
    })
    @patch('requests.get')
    def test_tokens_discovery_and_validation(self, mock_get):
        """测试 Token 自动发现和验证功能"""
        # Mock 成功的 GitHub API 响应
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resources': {
                'core': {
                    'remaining': 4500,
                    'limit': 5000,
                    'reset': int(time.time()) + 3600  # 1小时后重置
                }
            }
        }
        mock_get.return_value = mock_response

        with patch('keyword_scraper.logger') as mock_logger:
            manager = GitHubTokenManager()

            # 验证发现了两个 Token
            assert len(manager.tokens) == 2
            assert ('MAIN', 'ghp_test_main_token') in manager.tokens
            assert ('BACKUP', 'ghp_test_backup_token') in manager.tokens

            # 验证日志输出
            mock_logger.info.assert_any_call("发现 Token: MAIN")
            mock_logger.info.assert_any_call("发现 Token: BACKUP")
    
    @patch.dict(os.environ, {
        'GITHUB_TOKEN_INVALID': 'invalid_token_123'
    })
    @patch('requests.get')
    def test_invalid_token_filtering(self, mock_get):
        """测试无效 Token 的自动过滤"""
        # Mock 401 响应（Token 无效）
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.json.return_value = {'message': 'Bad credentials'}
        mock_get.return_value = mock_response

        with patch('keyword_scraper.logger') as mock_logger:
            manager = GitHubTokenManager()

            # 无效 Token 应该被过滤掉
            assert len(manager.tokens) == 0
            assert manager.get_available_token() is None
            mock_logger.warning.assert_any_call("Token INVALID 无效或已过期")

    @patch.dict(os.environ, {
        'GITHUB_TOKEN_MAIN': 'ghp_valid_token'
    })
    @patch('requests.get')
    def test_rate_limit_checking(self, mock_get):
        """测试速率限制检查和缓存机制"""
        # Mock 验证响应
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resources': {
                'core': {
                    'remaining': 150,
                    'limit': 5000,
                    'reset': int(time.time()) + 3600
                }
            }
        }
        mock_get.return_value = mock_response

        manager = GitHubTokenManager()
        token = manager.get_available_token()

        assert token == 'ghp_valid_token'
        assert 'ghp_valid_token' in manager.rate_limits
        assert manager.rate_limits['ghp_valid_token']['remaining'] == 150
        assert manager.rate_limits['ghp_valid_token']['limit'] == 5000

    @patch.dict(os.environ, {
        'GITHUB_TOKEN_MAIN': 'ghp_test_token'
    })
    @patch('requests.get')
    def test_error_counting_and_recovery(self, mock_get):
        """测试错误计数和恢复机制"""
        # Mock 验证响应
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resources': {
                'core': {
                    'remaining': 5000,
                    'limit': 5000,
                    'reset': int(time.time()) + 3600
                }
            }
        }
        mock_get.return_value = mock_response

        manager = GitHubTokenManager()
        token = 'ghp_test_token'

        # 模拟多次错误
        for i in range(3):
            manager.record_error(token)

        assert manager.error_counts[token] == 3

        # 记录成功使用，错误计数应该减少
        manager.record_success(token)
        assert manager.error_counts[token] == 2

        # 再次成功，继续减少
        manager.record_success(token)
        assert manager.error_counts[token] == 1


class TestGitHubApiRequest:
    """测试 GitHub API 请求函数"""
    
    @patch('keyword_scraper.token_manager')
    @patch('requests.get')
    def test_successful_authenticated_request(self, mock_get, mock_token_manager):
        """测试成功的认证请求"""
        # Mock token manager
        mock_token_manager.get_available_token.return_value = 'ghp_test_token'
        mock_token_manager.record_success = Mock()
        
        # Mock 成功响应
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': 'test'}
        mock_get.return_value = mock_response
        
        result = github_api_request('https://api.github.com/test')
        
        assert result == {'data': 'test'}
        mock_token_manager.record_success.assert_called_once_with('ghp_test_token')
    
    @patch('keyword_scraper.token_manager')
    @patch('requests.get')
    def test_unauthenticated_request_fallback(self, mock_get, mock_token_manager):
        """测试无认证请求降级"""
        # Mock token manager 返回 None（无可用 Token）
        mock_token_manager.get_available_token.return_value = None
        
        # Mock 成功响应
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': 'test'}
        mock_get.return_value = mock_response
        
        result = github_api_request('https://api.github.com/test')
        
        assert result == {'data': 'test'}
        # 验证请求头中没有 Authorization
        call_args = mock_get.call_args
        headers = call_args[1]['headers']
        assert 'Authorization' not in headers
    
    @patch('keyword_scraper.token_manager')
    @patch('requests.get')
    def test_rate_limit_handling(self, mock_get, mock_token_manager):
        """测试速率限制处理"""
        mock_token_manager.get_available_token.return_value = 'ghp_test_token'
        mock_token_manager.record_error = Mock()
        
        # Mock 403 速率限制响应
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.json.return_value = {'message': 'API rate limit exceeded'}
        mock_get.return_value = mock_response
        
        with pytest.raises(requests.exceptions.HTTPError):
            github_api_request('https://api.github.com/test', max_retries=1)
        
        mock_token_manager.record_error.assert_called()
    
    @patch('keyword_scraper.token_manager')
    @patch('requests.get')
    def test_404_handling(self, mock_get, mock_token_manager):
        """测试 404 错误处理"""
        mock_token_manager.get_available_token.return_value = 'ghp_test_token'
        
        # Mock 404 响应
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        result = github_api_request('https://api.github.com/test')
        
        assert result is None
    
    @patch('keyword_scraper.token_manager')
    @patch('requests.get')
    def test_timeout_retry(self, mock_get, mock_token_manager):
        """测试超时重试机制"""
        mock_token_manager.get_available_token.return_value = 'ghp_test_token'
        
        # Mock 超时异常
        mock_get.side_effect = requests.exceptions.Timeout()
        
        with pytest.raises(Exception) as exc_info:
            github_api_request('https://api.github.com/test', max_retries=2)
        
        assert "达到最大重试次数" in str(exc_info.value)
        assert mock_get.call_count == 2  # 应该重试 2 次


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
