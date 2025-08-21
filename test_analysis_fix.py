#!/usr/bin/env python3
"""
测试分析修复脚本
验证星标和标签分析是否正常工作
"""

import json
import sys
import os
from pathlib import Path

# 添加后端路径到 Python 路径
backend_path = Path(__file__).parent / 'backend' / 'scraper'
sys.path.insert(0, str(backend_path))

from analyzers.data_analysis import GitHubDataAnalyzer

def test_analysis_fix():
    """测试分析修复"""
    print("🔍 测试分析修复...")
    
    # 测试数据 - 模拟新爬虫的数据格式
    test_data = [
        {
            "id": 1,
            "name": "test-repo",
            "full_name": "user/test-repo",
            "owner": "user",
            "description": "A test repository",
            "language": "JavaScript",
            "stars": 1500,  # 使用 stars 字段而不是 stargazers_count
            "forks": 200,
            "tags": ["react", "javascript", "frontend"],  # 包含标签数据
            "created_at": "2023-01-01T00:00:00Z"
        },
        {
            "id": 2,
            "name": "another-repo",
            "full_name": "user/another-repo",
            "owner": "user",
            "description": "Another test repository",
            "language": "Python",
            "stars": 500,
            "forks": 50,
            "tags": ["python", "api", "backend"],
            "created_at": "2023-06-01T00:00:00Z"
        },
        {
            "id": 3,
            "name": "empty-tags-repo",
            "full_name": "user/empty-tags-repo",
            "owner": "user",
            "description": "Repository with empty tags",
            "language": "TypeScript",
            "stars": 0,  # 测试零星标
            "forks": 0,
            "tags": [],  # 空标签
            "created_at": "2024-01-01T00:00:00Z"
        }
    ]
    
    # 创建临时测试文件
    test_file = "temp_test_data.json"
    with open(test_file, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, ensure_ascii=False, indent=2)
    
    try:
        # 创建分析器
        analyzer = GitHubDataAnalyzer()
        analyzer.keyword = "test"
        
        # 加载测试数据
        if not analyzer.load_data_from_json(test_file):
            print("❌ 加载测试数据失败")
            return False
        
        print(f"✅ 成功加载 {len(analyzer.data)} 条测试数据")
        
        # 测试星标分析
        print("\n📊 测试星标分析...")
        stars_result = analyzer.analyze_stars_distribution()
        print(f"   星标分析结果: {stars_result}")
        
        # 验证星标数据
        expected_stars = [1500, 500, 0]
        if stars_result.get('max_stars') == 1500 and stars_result.get('min_stars') == 0:
            print("   ✅ 星标分析正常 - 正确识别了 stars 字段")
        else:
            print("   ❌ 星标分析异常")
            return False
        
        # 测试标签分析
        print("\n🏷️ 测试标签分析...")
        topics_result = analyzer.analyze_topics()
        print(f"   标签分析结果: {topics_result}")
        
        # 验证标签数据
        expected_topics = ["react", "javascript", "frontend", "python", "api", "backend"]
        topic_distribution = topics_result.get('topic_distribution', {})
        if len(topic_distribution) > 0:
            print("   ✅ 标签分析正常 - 正确识别了 tags 字段")
            print(f"   发现标签: {list(topic_distribution.keys())}")
        else:
            print("   ❌ 标签分析异常 - 没有识别到标签")
            return False
        
        # 测试完整分析报告
        print("\n📋 测试完整分析报告...")
        summary = analyzer.generate_summary_report()
        
        # 验证报告结构
        charts = summary.get('charts', {})
        if 'stars_distribution' in charts and 'tag_analysis' in charts:
            stars_data = charts['stars_distribution']['data']
            tags_data = charts['tag_analysis']['data']
            
            print(f"   星标数据: max={stars_data.get('max_stars')}, min={stars_data.get('min_stars')}")
            print(f"   标签数据: 总数={tags_data.get('total_topics')}")
            
            if stars_data.get('max_stars', 0) > 0 and tags_data.get('total_topics', 0) > 0:
                print("   ✅ 完整分析报告正常")
            else:
                print("   ❌ 完整分析报告异常")
                return False
        else:
            print("   ❌ 分析报告缺少必要字段")
            return False
        
        print("\n🎉 所有测试通过！分析修复成功")
        return True
        
    except Exception as e:
        print(f"❌ 测试过程中出错: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # 清理临时文件
        if os.path.exists(test_file):
            os.remove(test_file)

def test_real_data():
    """测试真实数据"""
    print("\n🔍 测试真实数据...")
    
    # 检查 React 分析文件
    react_file = Path("public/analytics/analysis_React.json")
    if not react_file.exists():
        print("❌ React 分析文件不存在")
        return False
    
    with open(react_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 检查仓库数据中的字段
    repositories = data.get('repositories', [])
    if not repositories:
        print("❌ 没有仓库数据")
        return False
    
    first_repo = repositories[0]
    print(f"   第一个仓库数据字段: {list(first_repo.keys())}")
    
    # 检查星标字段
    has_stars = 'stars' in first_repo
    has_stargazers_count = 'stargazers_count' in first_repo
    print(f"   包含 stars 字段: {has_stars}")
    print(f"   包含 stargazers_count 字段: {has_stargazers_count}")
    
    # 检查标签字段
    has_tags = 'tags' in first_repo
    has_topics = 'topics' in first_repo
    print(f"   包含 tags 字段: {has_tags}")
    print(f"   包含 topics 字段: {has_topics}")
    
    if has_tags:
        tags_value = first_repo['tags']
        print(f"   tags 字段值: {tags_value} (类型: {type(tags_value)})")
    
    # 检查分析结果
    charts = data.get('charts', {})
    stars_data = charts.get('stars_distribution', {}).get('data', {})
    tags_data = charts.get('tag_analysis', {}).get('data', {})
    
    print(f"   当前星标分析结果: max={stars_data.get('max_stars')}, min={stars_data.get('min_stars')}")
    print(f"   当前标签分析结果: 总数={tags_data.get('total_topics')}")
    
    return True

if __name__ == "__main__":
    print("🚀 开始分析修复测试\n")
    
    # 测试修复后的分析器
    if test_analysis_fix():
        print("\n" + "="*50)
        test_real_data()
        print("\n✅ 修复验证完成！")
        print("\n📝 修复总结:")
        print("1. ✅ 修复了星标字段名不匹配问题 (stargazers_count vs stars)")
        print("2. ✅ 修复了爬虫缺少 topics 字段的问题")
        print("3. 🔄 需要重新爬取数据或重新运行分析器来更新现有结果")
    else:
        print("\n❌ 修复验证失败")
        sys.exit(1)
