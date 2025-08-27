#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
简化的GitHub API连接测试脚本
避免复杂的依赖问题，直接使用requests进行测试
"""

import os
import sys
import json
import requests
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 加载环境变量
try:
    from dotenv import load_dotenv
    env_path = project_root / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ 已加载环境变量文件: {env_path}")
except ImportError:
    print("⚠️ dotenv未安装，跳过环境变量文件加载")

def test_token_loading():
    """测试Token加载"""
    print("\n🔍 测试Token加载...")
    
    # 检查环境变量
    token_names = [
        'GITHUB_TOKEN_PQG', 'GITHUB_TOKEN_LR', 'GITHUB_TOKEN_HXZ', 
        'GITHUB_TOKEN_XHY', 'GITHUB_TOKEN', 'GITHUB_TOKENS'
    ]
    found_tokens = []
    
    for token_name in token_names:
        token = os.getenv(token_name, '')
        if token.strip():
            found_tokens.append({
                'name': token_name,
                'length': len(token),
                'token': token
            })
            print(f"✅ 找到Token: {token_name} (长度: {len(token)})")
    
    if not found_tokens:
        print("❌ 未找到任何GitHub Token")
        return False, None
    
    print(f"📊 总共找到 {len(found_tokens)} 个Token")
    return True, found_tokens

def test_api_connection(tokens):
    """测试API连接"""
    print("\n🌐 测试API连接...")
    
    if not tokens:
        print("❌ 没有可用的Token")
        return False, None
    
    # 使用第一个Token进行测试
    token = tokens[0]['token']
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Trending-Scraper/1.0'
    }
    
    try:
        # 测试API连接
        print("🔗 测试GitHub API连接...")
        response = requests.get(
            'https://api.github.com/rate_limit',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            rate_limit_data = response.json()
            print("✅ GitHub API连接成功")
            
            core_limit = rate_limit_data.get('rate', {}).get('core', {})
            remaining = core_limit.get('remaining', 0)
            limit = core_limit.get('limit', 0)
            reset_time = core_limit.get('reset', 0)
            
            print(f"📊 API速率限制: {remaining}/{limit} 剩余")
            
            return True, {
                'remaining': remaining,
                'limit': limit,
                'reset': reset_time
            }
        else:
            print(f"❌ GitHub API连接失败: HTTP {response.status_code}")
            print(f"响应内容: {response.text[:200]}")
            return False, None
            
    except requests.exceptions.Timeout:
        print("❌ API连接超时")
        return False, None
    except requests.exceptions.ConnectionError:
        print("❌ 网络连接错误")
        return False, None
    except Exception as e:
        print(f"❌ API连接测试失败: {e}")
        return False, None

def test_simple_search(tokens):
    """测试简单搜索"""
    print("\n🔍 测试简单搜索...")
    
    if not tokens:
        print("❌ 没有可用的Token")
        return False
    
    # 使用第一个Token进行测试
    token = tokens[0]['token']
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Trending-Scraper/1.0'
    }
    
    try:
        # 执行简单搜索
        url = 'https://api.github.com/search/repositories'
        params = {
            'q': 'python',
            'sort': 'stars',
            'order': 'desc',
            'per_page': 5
        }
        
        response = requests.get(
            url,
            headers=headers,
            params=params,
            timeout=15
        )
        
        if response.status_code == 200:
            results = response.json()
            items = results.get('items', [])
            
            if len(items) > 0:
                print(f"✅ 搜索成功，找到 {len(items)} 个仓库")
                
                # 显示前几个结果
                for i, repo in enumerate(items[:3]):
                    name = repo.get('full_name', 'Unknown')
                    stars = repo.get('stargazers_count', 0)
                    print(f"  📦 {name} - {stars:,} stars")
                
                return True
            else:
                print("❌ 搜索成功但无结果")
                return False
        else:
            print(f"❌ 搜索失败: HTTP {response.status_code}")
            print(f"响应内容: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ 搜索请求超时")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ 搜索网络连接错误")
        return False
    except Exception as e:
        print(f"❌ 搜索测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🧪 GitHub API连接测试 (简化版)")
    print("=" * 50)
    
    # 执行测试
    results = {}
    
    # 1. 测试Token加载
    token_result, tokens = test_token_loading()
    results['token_loading'] = token_result
    
    # 2. 测试API连接
    if token_result and tokens:
        api_result, rate_limit = test_api_connection(tokens)
        results['api_connection'] = api_result
        results['rate_limit'] = rate_limit
        
        # 3. 测试简单搜索
        if api_result:
            search_result = test_simple_search(tokens)
            results['simple_search'] = search_result
        else:
            results['simple_search'] = False
    else:
        results['api_connection'] = False
        results['simple_search'] = False
        results['rate_limit'] = None
    
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
    
    # 输出JSON格式的结果供API使用
    json_result = {
        'tokenLoading': results['token_loading'],
        'apiConnection': results['api_connection'],
        'simpleSearch': results['simple_search'],
        'rateLimit': results['rate_limit'],
        'summary': {
            'total': len(test_items),
            'passed': passed,
            'failed': len(test_items) - passed
        }
    }
    
    print(f"\n📋 JSON结果:")
    print(json.dumps(json_result, indent=2, ensure_ascii=False))
    
    if passed == len(test_items):
        print("\n🎉 所有测试通过！GitHub API连接正常")
        return True
    else:
        print("\n⚠️  部分测试失败，请检查配置")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
