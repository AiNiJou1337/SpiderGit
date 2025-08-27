#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
网络连接诊断工具
用于诊断GitHub访问问题
"""

import requests
import socket
import time
import logging
from typing import Dict, Any, List
import subprocess
import platform

logger = logging.getLogger(__name__)

class NetworkDiagnostic:
    """网络诊断工具"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.trust_env = False
        self.session.proxies = {}
        
    def diagnose_all(self) -> Dict[str, Any]:
        """执行完整的网络诊断"""
        results = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'dns_resolution': self.test_dns_resolution(),
            'basic_connectivity': self.test_basic_connectivity(),
            'github_access': self.test_github_access(),
            'trending_access': self.test_trending_access(),
            'proxy_settings': self.check_proxy_settings(),
            'recommendations': []
        }
        
        # 生成建议
        results['recommendations'] = self.generate_recommendations(results)
        
        return results
    
    def test_dns_resolution(self) -> Dict[str, Any]:
        """测试DNS解析"""
        print("🔍 测试DNS解析...")
        
        hosts = ['github.com', 'api.github.com']
        results = {}
        
        for host in hosts:
            try:
                start_time = time.time()
                ip = socket.gethostbyname(host)
                resolve_time = (time.time() - start_time) * 1000
                
                results[host] = {
                    'success': True,
                    'ip': ip,
                    'resolve_time_ms': round(resolve_time, 2)
                }
                print(f"✅ {host} -> {ip} ({resolve_time:.1f}ms)")
                
            except socket.gaierror as e:
                results[host] = {
                    'success': False,
                    'error': str(e)
                }
                print(f"❌ {host} DNS解析失败: {e}")
        
        return results
    
    def test_basic_connectivity(self) -> Dict[str, Any]:
        """测试基础连接"""
        print("\n🌐 测试基础连接...")
        
        test_urls = [
            'https://www.google.com',
            'https://www.baidu.com',
            'https://httpbin.org/get'
        ]
        
        results = {}
        
        for url in test_urls:
            try:
                start_time = time.time()
                response = self.session.get(url, timeout=10)
                response_time = (time.time() - start_time) * 1000
                
                results[url] = {
                    'success': True,
                    'status_code': response.status_code,
                    'response_time_ms': round(response_time, 2)
                }
                print(f"✅ {url} - {response.status_code} ({response_time:.1f}ms)")
                
            except Exception as e:
                results[url] = {
                    'success': False,
                    'error': str(e)
                }
                print(f"❌ {url} 连接失败: {e}")
        
        return results
    
    def test_github_access(self) -> Dict[str, Any]:
        """测试GitHub访问"""
        print("\n🐙 测试GitHub访问...")
        
        github_urls = [
            'https://github.com',
            'https://api.github.com',
            'https://api.github.com/rate_limit'
        ]
        
        results = {}
        
        for url in github_urls:
            try:
                start_time = time.time()
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = self.session.get(url, headers=headers, timeout=15)
                response_time = (time.time() - start_time) * 1000
                
                results[url] = {
                    'success': True,
                    'status_code': response.status_code,
                    'response_time_ms': round(response_time, 2),
                    'content_length': len(response.content)
                }
                print(f"✅ {url} - {response.status_code} ({response_time:.1f}ms)")
                
            except Exception as e:
                results[url] = {
                    'success': False,
                    'error': str(e)
                }
                print(f"❌ {url} 访问失败: {e}")
        
        return results
    
    def test_trending_access(self) -> Dict[str, Any]:
        """测试GitHub Trending访问"""
        print("\n📈 测试GitHub Trending访问...")
        
        trending_urls = [
            'https://github.com/trending',
            'https://github.com/trending?since=daily',
            'https://github.com/trending/python'
        ]
        
        results = {}
        
        for url in trending_urls:
            try:
                start_time = time.time()
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
                response = self.session.get(url, headers=headers, timeout=20)
                response_time = (time.time() - start_time) * 1000
                
                # 检查是否包含趋势页面的关键内容
                has_trending_content = 'trending' in response.text.lower() and 'repository' in response.text.lower()
                
                results[url] = {
                    'success': True,
                    'status_code': response.status_code,
                    'response_time_ms': round(response_time, 2),
                    'content_length': len(response.content),
                    'has_trending_content': has_trending_content
                }
                print(f"✅ {url} - {response.status_code} ({response_time:.1f}ms) {'[有趋势内容]' if has_trending_content else '[无趋势内容]'}")
                
            except Exception as e:
                results[url] = {
                    'success': False,
                    'error': str(e)
                }
                print(f"❌ {url} 访问失败: {e}")
        
        return results
    
    def check_proxy_settings(self) -> Dict[str, Any]:
        """检查代理设置"""
        print("\n🔧 检查代理设置...")
        
        import os
        
        proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY']
        proxy_settings = {}
        
        for var in proxy_vars:
            value = os.environ.get(var)
            if value:
                proxy_settings[var] = value
                print(f"⚠️  发现代理设置: {var}={value}")
        
        if not proxy_settings:
            print("✅ 未发现系统代理设置")
        
        return {
            'has_proxy': len(proxy_settings) > 0,
            'proxy_vars': proxy_settings
        }
    
    def generate_recommendations(self, results: Dict[str, Any]) -> List[str]:
        """生成诊断建议"""
        recommendations = []
        
        # DNS问题
        dns_results = results.get('dns_resolution', {})
        if not all(result.get('success', False) for result in dns_results.values()):
            recommendations.append("DNS解析失败，建议更换DNS服务器（如8.8.8.8或114.114.114.114）")
        
        # 基础连接问题
        basic_results = results.get('basic_connectivity', {})
        if not any(result.get('success', False) for result in basic_results.values()):
            recommendations.append("基础网络连接失败，请检查网络设置和防火墙")
        
        # GitHub访问问题
        github_results = results.get('github_access', {})
        if not github_results.get('https://github.com', {}).get('success', False):
            recommendations.append("GitHub主站访问失败，可能需要使用代理或VPN")
        
        # Trending访问问题
        trending_results = results.get('trending_access', {})
        trending_success = any(result.get('success', False) for result in trending_results.values())
        if not trending_success:
            recommendations.append("GitHub Trending页面访问失败，建议使用API方式获取数据")
        
        # 代理问题
        proxy_settings = results.get('proxy_settings', {})
        if proxy_settings.get('has_proxy', False):
            recommendations.append("检测到代理设置，如果代理不可用请清除相关环境变量")
        
        if not recommendations:
            recommendations.append("网络连接正常，如果仍有问题请检查防火墙和安全软件设置")
        
        return recommendations
    
    def print_summary(self, results: Dict[str, Any]):
        """打印诊断摘要"""
        print("\n" + "="*60)
        print("📊 网络诊断摘要")
        print("="*60)
        
        # 统计成功率
        total_tests = 0
        successful_tests = 0
        
        for category, tests in results.items():
            if isinstance(tests, dict) and category not in ['timestamp', 'recommendations', 'proxy_settings']:
                for test_name, test_result in tests.items():
                    if isinstance(test_result, dict) and 'success' in test_result:
                        total_tests += 1
                        if test_result['success']:
                            successful_tests += 1
        
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        print(f"总体成功率: {successful_tests}/{total_tests} ({success_rate:.1f}%)")
        
        # 打印建议
        print(f"\n💡 建议:")
        for i, recommendation in enumerate(results.get('recommendations', []), 1):
            print(f"  {i}. {recommendation}")

def main():
    """主函数"""
    print("🔍 GitHub网络连接诊断工具")
    print("="*60)
    
    diagnostic = NetworkDiagnostic()
    results = diagnostic.diagnose_all()
    diagnostic.print_summary(results)
    
    # 保存诊断结果
    import json
    with open('network_diagnostic_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 详细结果已保存到: network_diagnostic_results.json")

if __name__ == "__main__":
    main()
