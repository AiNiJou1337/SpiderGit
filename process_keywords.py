"""
临时脚本 - 生成关键词分析结果
"""

import os
import json
import psycopg2
from datetime import datetime

# 定义输出目录
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'analytics')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 定义数据库连接参数
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'dbname': 'github_trending',
    'user': 'postgres',
    'password': 'postgres'
}

# 定义要分析的关键词
KEYWORDS = ["Application API"]

# 连接数据库
try:
    print(f"连接数据库...")
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    
    for keyword in KEYWORDS:
        print(f"处理关键词: {keyword}")
        
        # 安全文件名处理
        safe_keyword = keyword.replace(' ', '_').replace('/', '_').replace('\\', '_')
        output_file = os.path.join(OUTPUT_DIR, f"analysis_{safe_keyword}.json")
        
        # 获取关键词ID
        with conn.cursor() as cursor:
            cursor.execute('SELECT id FROM "keywords" WHERE "text" = %s', (keyword,))
            keyword_record = cursor.fetchone()
            
            if not keyword_record:
                print(f"未找到关键词: {keyword}")
                continue
                
            keyword_id = keyword_record[0]
            
            # 获取仓库
            cursor.execute('''
                SELECT r.id, r.name, r.full_name, r.language, r.stars, r.forks
                FROM "repositories" r
                JOIN "repository_keywords" rk ON r.id = rk."repositoryId"
                WHERE rk."keywordId" = %s
                ORDER BY r.stars DESC
            ''', (keyword_id,))
            
            repositories = []
            for row in cursor.fetchall():
                repo = {
                    'id': row[0],
                    'name': row[1],
                    'full_name': row[2],
                    'language': row[3],
                    'stars': row[4],
                    'forks': row[5]
                }
                repositories.append(repo)
            
            print(f"找到 {len(repositories)} 个仓库")
            
            # 统计语言分布
            languages = {}
            for repo in repositories:
                if repo['language']:
                    lang = repo['language']
                    languages[lang] = languages.get(lang, 0) + 1
            
            # 计算平均星标
            avg_stars = sum(r['stars'] for r in repositories) / len(repositories) if repositories else 0
            max_stars = max(r['stars'] for r in repositories) if repositories else 0
            min_stars = min(r['stars'] for r in repositories) if repositories else 0
            
            # 创建分析结果
            analysis_result = {
                'keyword': keyword,
                'repository_count': len(repositories),
                'analysis_date': datetime.now().isoformat(),
                'charts': {
                    'language_distribution': {
                        'data': languages
                    },
                    'stars_distribution': {
                        'data': {
                            'min': min_stars,
                            'max': max_stars,
                            'mean': avg_stars
                        }
                    }
                }
            }
            
            # 保存结果
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(analysis_result, f, ensure_ascii=False, indent=2)
            
            print(f"分析结果已保存到: {output_file}")
    
    print("所有关键词处理完成")
    
except Exception as e:
    print(f"错误: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
        print("数据库连接已关闭") 