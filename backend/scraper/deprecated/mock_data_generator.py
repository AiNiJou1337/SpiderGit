#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
模拟数据生成器 - 用于测试和演示
当网络无法访问GitHub API时，生成模拟的仓库数据
"""

import os
import sys
import json
import random
import datetime
import psycopg2
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

# 模拟仓库数据模板
MOCK_REPOSITORIES = {
    'react': {
        'javascript': [
            {
                'name': 'react',
                'full_name': 'facebook/react',
                'owner': 'facebook',
                'description': 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
                'language': 'JavaScript',
                'stars': 220000,
                'forks': 45000,
                'url': 'https://github.com/facebook/react'
            },
            {
                'name': 'create-react-app',
                'full_name': 'facebook/create-react-app',
                'owner': 'facebook',
                'description': 'Set up a modern web app by running one command.',
                'language': 'JavaScript',
                'stars': 102000,
                'forks': 26000,
                'url': 'https://github.com/facebook/create-react-app'
            },
            {
                'name': 'react-router',
                'full_name': 'remix-run/react-router',
                'owner': 'remix-run',
                'description': 'Declarative routing for React',
                'language': 'JavaScript',
                'stars': 52000,
                'forks': 10000,
                'url': 'https://github.com/remix-run/react-router'
            }
        ],
        'typescript': [
            {
                'name': 'ant-design',
                'full_name': 'ant-design/ant-design',
                'owner': 'ant-design',
                'description': 'An enterprise-class UI design language and React UI library',
                'language': 'TypeScript',
                'stars': 90000,
                'forks': 40000,
                'url': 'https://github.com/ant-design/ant-design'
            },
            {
                'name': 'material-ui',
                'full_name': 'mui/material-ui',
                'owner': 'mui',
                'description': 'MUI Core: Ready-to-use foundational React components',
                'language': 'TypeScript',
                'stars': 92000,
                'forks': 31000,
                'url': 'https://github.com/mui/material-ui'
            }
        ]
    }
}

def generate_mock_data(keyword, languages, limits, task_id):
    """生成模拟数据"""
    print(f"🎭 生成模拟数据: {keyword}")
    
    # 获取数据库连接
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        print("❌ 数据库连接字符串未找到")
        return False
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # 更新任务状态
        cursor.execute("""
            UPDATE crawl_tasks 
            SET status = 'running', progress = 10, message = '开始生成模拟数据...'
            WHERE id = %s
        """, (task_id,))
        conn.commit()
        
        total_repos = 0
        js_repos = 0
        ts_repos = 0
        
        # 获取或创建关键词
        cursor.execute("SELECT id FROM keywords WHERE text = %s", (keyword,))
        keyword_record = cursor.fetchone()
        if not keyword_record:
            cursor.execute("INSERT INTO keywords (text) VALUES (%s) RETURNING id", (keyword,))
            keyword_id = cursor.fetchone()[0]
        else:
            keyword_id = keyword_record[0]
        
        # 生成每种语言的数据
        for language in languages:
            limit = limits.get(language, 30)
            
            # 更新进度
            progress = 20 + (languages.index(language) * 30)
            cursor.execute("""
                UPDATE crawl_tasks 
                SET progress = %s, message = %s
                WHERE id = %s
            """, (progress, f'生成 {language} 模拟数据...', task_id))
            conn.commit()
            
            # 获取模拟数据模板
            mock_repos = MOCK_REPOSITORIES.get(keyword, {}).get(language, [])
            
            # 生成指定数量的仓库
            for i in range(min(limit, len(mock_repos) * 10)):  # 重复使用模板数据
                base_repo = mock_repos[i % len(mock_repos)]
                
                # 添加随机变化
                repo_data = {
                    'name': f"{base_repo['name']}-{i+1}" if i >= len(mock_repos) else base_repo['name'],
                    'full_name': f"{base_repo['owner']}/{base_repo['name']}-{i+1}" if i >= len(mock_repos) else base_repo['full_name'],
                    'owner': base_repo['owner'],
                    'description': base_repo['description'],
                    'language': language,
                    'stars': base_repo['stars'] + random.randint(-1000, 1000),
                    'forks': base_repo['forks'] + random.randint(-100, 100),
                    'today_stars': random.randint(0, 50),
                    'url': base_repo['url'],
                    'created_at': datetime.datetime.now() - datetime.timedelta(days=random.randint(30, 1000)),
                    'updated_at': datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 30)),
                    'trending': random.choice([True, False]),
                    'trend_date': datetime.datetime.now(),
                    'trend_period': 'daily',
                    'tags': ['react', 'javascript', 'frontend', 'ui'] if language == 'JavaScript' else ['react', 'typescript', 'frontend', 'ui']
                }
                
                # 插入仓库数据
                cursor.execute("""
                    INSERT INTO repositories (
                        name, owner, full_name, description, language, stars, forks, 
                        today_stars, url, created_at, updated_at, trending, trend_date, 
                        trend_period, tags
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) ON CONFLICT (full_name) DO UPDATE SET
                        stars = EXCLUDED.stars,
                        forks = EXCLUDED.forks,
                        updated_at = EXCLUDED.updated_at
                    RETURNING id
                """, (
                    repo_data['name'], repo_data['owner'], repo_data['full_name'],
                    repo_data['description'], repo_data['language'], repo_data['stars'],
                    repo_data['forks'], repo_data['today_stars'], repo_data['url'],
                    repo_data['created_at'], repo_data['updated_at'], repo_data['trending'],
                    repo_data['trend_date'], repo_data['trend_period'], repo_data['tags']
                ))
                
                repo_id = cursor.fetchone()[0]
                
                # 创建关键词关联
                cursor.execute("""
                    INSERT INTO repository_keywords ("repositoryId", "keywordId")
                    VALUES (%s, %s)
                    ON CONFLICT ("repositoryId", "keywordId") DO NOTHING
                """, (repo_id, keyword_id))
                
                total_repos += 1
                if language.lower() == 'javascript':
                    js_repos += 1
                elif language.lower() == 'typescript':
                    ts_repos += 1
        
        # 更新任务完成状态
        cursor.execute("""
            UPDATE crawl_tasks 
            SET status = 'completed', progress = 100, 
                message = '模拟数据生成完成', completed_at = %s,
                total_repositories = %s, python_repositories = 0, java_repositories = 0
            WHERE id = %s
        """, (datetime.datetime.now(), total_repos, task_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"✅ 模拟数据生成完成:")
        print(f"   - 总仓库数: {total_repos}")
        print(f"   - JavaScript仓库: {js_repos}")
        print(f"   - TypeScript仓库: {ts_repos}")
        
        return True
        
    except Exception as e:
        print(f"❌ 生成模拟数据失败: {e}")
        
        # 更新任务失败状态
        try:
            cursor.execute("""
                UPDATE crawl_tasks 
                SET status = 'failed', message = %s
                WHERE id = %s
            """, (f'模拟数据生成失败: {str(e)}', task_id))
            conn.commit()
        except:
            pass
        
        return False

if __name__ == "__main__":
    # 测试生成模拟数据
    generate_mock_data('react', ['javascript', 'typescript'], {'javascript': 3, 'typescript': 2}, 999)
