#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
GitHub API连接测试脚本
用于验证Token配置和网络连接是否正常
移动自 backend/scraper/test_connection.py
"""

import os
import sys
import logging
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 加载环境变量
from dotenv import load_dotenv
env_path = project_root / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ 已加载环境变量文件: {env_path}")

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_token_loading():
    """测试Token加载"""
    print("\n🔍 测试Token加载...")
    
    # 检查环境变量
    token_names = ['GITHUB_TOKEN_PQG', 'GITHUB_TOKEN_LR', 'GITHUB_TOKEN_HXZ', 'GITHUB_TOKEN_XHY', 'GITHUB_TOKEN', 'GITHUB_TOKENS']
    found_tokens = []
    
    for token_name in token_names:
        token = os.getenv(token_name, '')
        if token.strip():
            found_tokens.append(token_name)
            print(f"✅ 找到Token: {token_name} (长度: {len(token)})")
    
    if not found_tokens:
        print("❌ 未找到任何GitHub Token")
        return False
    
    print(f"📊 总共找到 {len(found_tokens)} 个Token")
    return True

def test_api_connection():
    """测试API连接"""
    print("\n🌐 测试API连接...")

    try:
        # 导入API客户端
        from backend.scraper.core.token_manager import TokenManager
        from backend.scraper.core.api_client import GitHubAPIClient

        # 初始化Token管理器
        token_manager = TokenManager()
        print(f"📊 Token管理器加载了 {len(token_manager.tokens)} 个Token")

        # 初始化API客户端
        api_client = GitHubAPIClient()

        # 测试连接
        print("🔗 测试GitHub API连接...")

        # 使用正确的方法名
        try:
            rate_limit = api_client.get_rate_limit_status()
        except AttributeError:
            # 如果方法不存在，尝试其他可能的方法名
            try:
                rate_limit = api_client.get_rate_limit()
            except AttributeError:
                # 如果都不存在，进行简单的API调用测试
                import requests
                token = token_manager.get_token() if hasattr(token_manager, 'get_token') else None
                if token:
                    headers = {'Authorization': f'token {token}'}
                    response = requests.get('https://api.github.com/rate_limit', headers=headers, timeout=10)
                    if response.status_code == 200:
                        rate_limit = response.json()
                    else:
                        rate_limit = None
                else:
                    rate_limit = None

        if rate_limit:
            print("✅ GitHub API连接成功")
            core_limit = rate_limit.get('core', {}) if isinstance(rate_limit, dict) else {}
            remaining = core_limit.get('remaining', 0)
            limit = core_limit.get('limit', 0)
            print(f"📊 API速率限制: {remaining}/{limit} 剩余")
            return True, {'remaining': remaining, 'limit': limit}
        else:
            print("❌ GitHub API连接失败")
            return False, None

    except Exception as e:
        print(f"❌ API连接测试失败: {e}")
        logger.exception("API连接测试异常")
        return False, None

def test_simple_search():
    """测试简单搜索"""
    print("\n🔍 测试简单搜索...")

    try:
        from backend.scraper.core.api_client import GitHubAPIClient
        from backend.scraper.core.token_manager import TokenManager

        api_client = GitHubAPIClient()
        token_manager = TokenManager()

        # 执行简单搜索
        try:
            results = api_client.search_repositories('python', per_page=5)
        except AttributeError:
            # 如果方法不存在，使用直接的API调用
            import requests
            token = token_manager.get_token() if hasattr(token_manager, 'get_token') else None
            if token:
                headers = {'Authorization': f'token {token}'}
                url = 'https://api.github.com/search/repositories?q=python&per_page=5'
                response = requests.get(url, headers=headers, timeout=10)
                if response.status_code == 200:
                    results = response.json()
                else:
                    results = None
            else:
                results = None

        if results and 'items' in results and len(results['items']) > 0:
            print(f"✅ 搜索成功，找到 {len(results['items'])} 个仓库")

            # 显示前几个结果
            for i, repo in enumerate(results['items'][:3]):
                name = repo.get('full_name', 'Unknown')
                stars = repo.get('stargazers_count', 0)
                print(f"  📦 {name} - {stars} stars")

            return True
        else:
            print("❌ 搜索失败或无结果")
            return False

    except Exception as e:
        print(f"❌ 搜索测试失败: {e}")
        logger.exception("搜索测试异常")
        return False

def main():
    """主测试函数"""
    print("🧪 GitHub API连接测试")
    print("=" * 50)
    
    # 执行测试
    results = {}
    
    # 1. 测试Token加载
    results['token_loading'] = test_token_loading()
    
    # 2. 测试API连接
    api_result, rate_limit = test_api_connection()
    results['api_connection'] = api_result
    results['rate_limit'] = rate_limit
    
    # 3. 测试简单搜索
    results['simple_search'] = test_simple_search()
    
    # 打印总结
    print("\n📊 测试结果总结")
    print("=" * 50)
    
    test_items = [
        ('Token加载', results['token_loading']),
        ('API连接', results['api_connection']),
        ('简单搜索', results['simple_search'])
    ]
    
    passed = 0
    for name, result in test_items:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 总体结果: {passed}/{len(test_items)} 测试通过")
    
    if passed == len(test_items):
        print("🎉 所有测试通过！GitHub API连接正常")
        return True
    else:
        print("⚠️  部分测试失败，请检查配置")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
