#!/usr/bin/env python3
"""
修复缺失标签数据的脚本
为现有的仓库数据补充标签信息
"""

import sys
import os
import json
import time
import requests
import psycopg2
from pathlib import Path

# 数据库配置
DB_URL = "postgresql://postgres:114514@localhost:5432/github_spider"

def get_db_connection():
    """获取数据库连接"""
    try:
        conn = psycopg2.connect(DB_URL)
        return conn
    except Exception as e:
        print(f"数据库连接失败: {e}")
        raise

def get_github_token():
    """获取 GitHub token"""
    # 从环境变量或配置文件获取
    token = os.getenv('GITHUB_TOKEN')
    if not token:
        # 尝试从配置文件读取
        config_file = Path(__file__).parent / 'backend' / 'scraper' / 'config.py'
        if config_file.exists():
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # 简单的token提取
                    for line in content.split('\n'):
                        if 'GITHUB_TOKENS' in line and '=' in line:
                            # 提取第一个token
                            tokens_part = line.split('=')[1].strip()
                            if '[' in tokens_part and ']' in tokens_part:
                                tokens_str = tokens_part.split('[')[1].split(']')[0]
                                tokens = [t.strip().strip('"\'') for t in tokens_str.split(',')]
                                if tokens and tokens[0]:
                                    token = tokens[0]
                                    break
            except Exception as e:
                print(f"读取配置文件失败: {e}")
    
    return token

def fetch_repo_topics(full_name, token):
    """从 GitHub API 获取仓库的 topics"""
    url = f"https://api.github.com/repos/{full_name}"
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.mercy-preview+json'  # 支持 topics
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            return data.get('topics', [])
        elif response.status_code == 404:
            print(f"   仓库不存在: {full_name}")
            return None
        else:
            print(f"   API 请求失败: {response.status_code}")
            return None
    except Exception as e:
        print(f"   请求异常: {e}")
        return None

def update_repository_tags(repo_id, tags, cursor):
    """更新数据库中的仓库标签"""
    try:
        cursor.execute('''
            UPDATE repositories 
            SET tags = %s 
            WHERE id = %s
        ''', (json.dumps(tags), repo_id))
        return True
    except Exception as e:
        print(f"   数据库更新失败: {e}")
        return False

def fix_missing_tags_for_keyword(keyword, limit=None):
    """为指定关键词的仓库补充标签数据"""
    print(f"🔧 修复关键词 '{keyword}' 的标签数据...")
    
    # 获取 GitHub token
    token = get_github_token()
    if not token:
        print("❌ 未找到 GitHub token，无法调用 API")
        return False
    
    # 连接数据库
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 查询该关键词下标签为空的仓库
        cursor.execute('''
            SELECT r.id, r.full_name, r.tags
            FROM repositories r
            JOIN repository_keywords rk ON r.id = rk."repositoryId"
            JOIN keywords k ON rk."keywordId" = k.id
            WHERE k.name = %s AND (r.tags IS NULL OR r.tags = '[]' OR r.tags = '')
            ORDER BY r.stars DESC
        ''', (keyword,))
        
        repositories = cursor.fetchall()
        
        if not repositories:
            print(f"   ✅ 关键词 '{keyword}' 的所有仓库都已有标签数据")
            return True
        
        print(f"   找到 {len(repositories)} 个需要更新标签的仓库")
        
        if limit:
            repositories = repositories[:limit]
            print(f"   限制处理前 {limit} 个仓库")
        
        updated_count = 0
        failed_count = 0
        
        for repo_id, full_name, current_tags in repositories:
            print(f"   处理: {full_name}")
            
            # 获取标签数据
            topics = fetch_repo_topics(full_name, token)
            
            if topics is not None:
                # 更新数据库
                if update_repository_tags(repo_id, topics, cursor):
                    updated_count += 1
                    print(f"     ✅ 更新成功，标签: {topics}")
                else:
                    failed_count += 1
                    print(f"     ❌ 数据库更新失败")
            else:
                failed_count += 1
                print(f"     ❌ 获取标签失败")
            
            # 避免触发 API 限制
            time.sleep(0.5)
        
        # 提交更改
        conn.commit()
        
        print(f"   📊 更新完成: {updated_count} 成功, {failed_count} 失败")
        return updated_count > 0
        
    except Exception as e:
        print(f"   ❌ 处理过程中出错: {e}")
        conn.rollback()
        return False
    
    finally:
        cursor.close()
        conn.close()

def main():
    """主函数"""
    print("🚀 开始修复缺失的标签数据\n")
    
    # 需要修复的关键词
    keywords_to_fix = [
        "React",
        "Estate API",
        # 可以添加其他关键词
    ]
    
    success_count = 0
    
    for keyword in keywords_to_fix:
        if fix_missing_tags_for_keyword(keyword, limit=20):  # 限制每个关键词处理20个仓库
            success_count += 1
        print()
    
    print("="*50)
    print(f"📊 修复完成: {success_count}/{len(keywords_to_fix)} 个关键词成功")
    
    if success_count > 0:
        print("\n🔄 现在需要重新运行分析器来更新分析结果:")
        print("   python backend/scraper/analyzers/data_analysis.py --keywords React")
        print("   python backend/scraper/analyzers/data_analysis.py --keywords \"Estate API\"")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
