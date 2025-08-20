#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
GitHub Token 管理器（重构后版本）
管理多个 GitHub API Token，实现自动轮换和速率限制处理
"""

import os
import time
import logging
import requests
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class GitHubTokenManager:
    """GitHub Token 管理器"""
    
    def __init__(self):
        self.tokens: List[str] = []
        self.current_token_index = 0
        self.token_status: Dict[str, Dict[str, Any]] = {}
        self.load_tokens()
        
    def load_tokens(self) -> None:
        """从环境变量加载 Token"""
        # 从环境变量获取 Token
        tokens_env = os.getenv('GITHUB_TOKENS', '')
        if tokens_env:
            self.tokens = [token.strip() for token in tokens_env.split(',') if token.strip()]
        
        # 如果没有从环境变量获取到，尝试从单个 Token 环境变量获取
        if not self.tokens:
            single_token = os.getenv('GITHUB_TOKEN', '')
            if single_token:
                self.tokens = [single_token.strip()]
        
        # 如果还是没有，使用默认的测试 Token（仅用于开发）
        if not self.tokens:
            logger.warning("未找到 GitHub Token，请设置 GITHUB_TOKENS 环境变量")
            # 这里可以添加一些默认的测试 Token，但不建议在生产环境中使用
        
        logger.info(f"加载了 {len(self.tokens)} 个 GitHub Token")
        
        # 初始化 Token 状态
        for token in self.tokens:
            self.token_status[token] = {
                'remaining': 5000,
                'reset_time': datetime.now() + timedelta(hours=1),
                'last_check': datetime.now()
            }
    
    def get_current_token(self) -> Optional[str]:
        """获取当前可用的 Token"""
        if not self.tokens:
            return None
        
        # 检查当前 Token 是否可用
        current_token = self.tokens[self.current_token_index]
        if self._is_token_available(current_token):
            return current_token
        
        # 如果当前 Token 不可用，尝试轮换
        new_token = self._rotate_token()
        return new_token
    
    def get_headers(self) -> Dict[str, str]:
        """获取包含认证信息的请求头"""
        token = self.get_current_token()
        headers = {
            'User-Agent': 'GitHub-Trending-Scraper/1.0',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        if token:
            headers['Authorization'] = f'token {token}'
        
        return headers
    
    def _is_token_available(self, token: str) -> bool:
        """检查 Token 是否可用"""
        if token not in self.token_status:
            return True
        
        status = self.token_status[token]
        
        # 如果速率限制已重置，更新状态
        if datetime.now() > status['reset_time']:
            status['remaining'] = 5000
            status['reset_time'] = datetime.now() + timedelta(hours=1)
        
        # 如果剩余请求数大于 100，认为可用
        return status['remaining'] > 100
    
    def _rotate_token(self) -> Optional[str]:
        """轮换到下一个可用的 Token"""
        if not self.tokens:
            return None
        
        original_index = self.current_token_index
        
        # 尝试所有 Token
        for _ in range(len(self.tokens)):
            self.current_token_index = (self.current_token_index + 1) % len(self.tokens)
            token = self.tokens[self.current_token_index]
            
            if self._is_token_available(token):
                logger.info(f"轮换到 Token {self.current_token_index + 1}")
                return token
        
        # 如果所有 Token 都不可用，回到原来的 Token
        self.current_token_index = original_index
        logger.warning("所有 Token 都已达到速率限制")
        return self.tokens[self.current_token_index] if self.tokens else None
    
    def update_token_status(self, token: str, remaining: int, reset_time: int) -> None:
        """更新 Token 状态"""
        if token in self.token_status:
            self.token_status[token].update({
                'remaining': remaining,
                'reset_time': datetime.fromtimestamp(reset_time),
                'last_check': datetime.now()
            })
    
    def check_rate_limit(self, token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """检查指定 Token 的速率限制状态"""
        if not token:
            token = self.get_current_token()
        
        if not token:
            return None
        
        try:
            headers = {'Authorization': f'token {token}'}
            response = requests.get('https://api.github.com/rate_limit', headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                core_limit = data.get('resources', {}).get('core', {})
                
                # 更新 Token 状态
                if 'remaining' in core_limit and 'reset' in core_limit:
                    self.update_token_status(
                        token, 
                        core_limit['remaining'], 
                        core_limit['reset']
                    )
                
                return core_limit
            
        except Exception as e:
            logger.error(f"检查速率限制失败: {e}")
        
        return None
    
    def wait_for_reset(self) -> None:
        """等待速率限制重置"""
        current_token = self.get_current_token()
        if not current_token or current_token not in self.token_status:
            return
        
        status = self.token_status[current_token]
        reset_time = status['reset_time']
        
        if datetime.now() < reset_time:
            wait_seconds = (reset_time - datetime.now()).total_seconds()
            logger.info(f"等待速率限制重置，剩余时间: {wait_seconds:.0f} 秒")
            time.sleep(min(wait_seconds, 3600))  # 最多等待1小时
    
    def get_status_summary(self) -> Dict[str, Any]:
        """获取所有 Token 的状态摘要"""
        summary = {
            'total_tokens': len(self.tokens),
            'current_token_index': self.current_token_index,
            'tokens_status': []
        }
        
        for i, token in enumerate(self.tokens):
            token_short = f"{token[:8]}..." if len(token) > 8 else token
            status = self.token_status.get(token, {})
            
            summary['tokens_status'].append({
                'index': i,
                'token': token_short,
                'remaining': status.get('remaining', 'unknown'),
                'reset_time': status.get('reset_time', 'unknown'),
                'is_current': i == self.current_token_index,
                'is_available': self._is_token_available(token)
            })
        
        return summary
