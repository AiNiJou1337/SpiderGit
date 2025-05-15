#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import time
import json
import argparse
import traceback
import datetime
import logging
import psycopg2
from pathlib import Path
from collections import Counter

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('data_analysis')

# 数据库连接信息
DB_URL = os.environ.get('DATABASE_URL')
if not DB_URL:
    # 从.env文件读取
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    DB_URL = line.split('=', 1)[1].strip()
                    break

if not DB_URL:
    # 使用默认连接字符串
    DB_URL = "postgresql://postgres:postgres@localhost:5432/github_trending"
    logger.warning(f"未找到数据库连接字符串，使用默认值: {DB_URL}")

# 创建图表存储目录 - 确保使用绝对路径
ANALYTICS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'analytics')
os.makedirs(ANALYTICS_DIR, exist_ok=True)
logger.info(f"分析结果将保存到: {os.path.abspath(ANALYTICS_DIR)}")

# 数据库连接
def get_db_connection():
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        raise

# 更新任务状态
def update_task_status(conn, task_id, status, progress, message=None):
    if not task_id:
        return
        
    try:
        with conn.cursor() as cursor:
            update_data = {
                'status': status,
                'progress': progress,
                'message': message
            }
            
            # 如果任务完成或失败，设置完成时间
            if status in ('completed', 'failed'):
                update_data['completed_at'] = datetime.datetime.now()
                
            # 构建SQL语句
            set_clause = ', '.join([f'"{k}" = %s' for k in update_data.keys()])
            values = list(update_data.values())
            
            sql = f'UPDATE "crawl_tasks" SET {set_clause} WHERE id = %s'
            values.append(task_id)
            
            cursor.execute(sql, values)
            conn.commit()
            logger.info(f"已更新任务 #{task_id} 状态: {status}, 进度: {progress}%")
    except Exception as e:
        logger.error(f"更新任务状态失败: {e}")
        conn.rollback()

# 获取关键词的仓库数据
def get_repositories_for_keyword(conn, keyword):
    try:
        with conn.cursor() as cursor:
            # 获取关键词ID
            cursor.execute('SELECT id FROM "keywords" WHERE "text" = %s', (keyword,))
            keyword_record = cursor.fetchone()
            
            if not keyword_record:
                logger.error(f"未找到关键词: {keyword}")
                return None
                
            keyword_id = keyword_record[0]
            
            # 获取与该关键词相关的仓库
            cursor.execute('''
                SELECT r.id, r.name, r.owner, r.full_name, r.description, r.language, 
                       r.stars, r.forks, r.url, r.tags
                FROM "repositories" r
                JOIN "repository_keywords" rk ON r.id = rk."repositoryId"
                WHERE rk."keywordId" = %s
            ''', (keyword_id,))
            
            repositories = []
            for row in cursor.fetchall():
                repositories.append({
                    'id': row[0],
                    'name': row[1],
                    'owner': row[2],
                    'full_name': row[3],
                    'description': row[4],
                    'language': row[5],
                    'stars': row[6],
                    'forks': row[7],
                    'url': row[8],
                    'tags': row[9] if row[9] else []
                })
            
            return {
                'keyword_id': keyword_id,
                'repositories': repositories,
                'keyword': keyword
            }
    except Exception as e:
        logger.error(f"获取仓库数据失败: {e}")
        return None

# 获取代码文件数据
def get_code_files(conn, repository_ids):
    if not repository_ids:
        return []
        
    try:
        with conn.cursor() as cursor:
            placeholder = ','.join(['%s'] * len(repository_ids))
            cursor.execute(f'''
                SELECT id, repository_id, filename, path, comments, api_endpoints, functions, packages, components
                FROM "code_files"
                WHERE repository_id IN ({placeholder})
            ''', repository_ids)
            
            code_files = []
            for row in cursor.fetchall():
                code_files.append({
                    'id': row[0],
                    'repository_id': row[1],
                    'filename': row[2],
                    'path': row[3],
                    'comments': row[4],
                    'api_endpoints': row[5] if row[5] else [],
                    'functions': row[6] if row[6] else [],
                    'packages': row[7] if row[7] else [],
                    'components': row[8] if row[8] else []
                })
            
            return code_files
    except Exception as e:
        logger.error(f"获取代码文件数据失败: {e}")
        return []

# 生成简化版的分析结果（不使用matplotlib）
def generate_and_save_analysis(data, output_dir, keyword, task_id=None, conn=None):
    try:
        # 更新进度到91%
        if task_id and conn:
            update_task_status(conn, task_id, 'running', 91, f"开始生成数据分析...")
        
        repositories = data['repositories']
        repository_ids = [repo['id'] for repo in repositories]
        
        # 文件名安全处理：将空格和特殊字符替换为下划线
        safe_keyword = keyword.replace(' ', '_').replace('/', '_').replace('\\', '_')
        
        # 统计语言分布
        language_distribution = {}
        for repo in repositories:
            if repo['language']:
                lang = repo['language']
                language_distribution[lang] = language_distribution.get(lang, 0) + 1
        
        # 计算星标统计
        stars = [repo['stars'] for repo in repositories if repo['stars'] is not None]
        stars_stats = {
            'mean': sum(stars) / len(stars) if stars else 0,
            'min': min(stars) if stars else 0,
            'max': max(stars) if stars else 0,
            'total': sum(stars) if stars else 0
        }
        
        # 更新进度到94%
        if task_id and conn:
            update_task_status(conn, task_id, 'running', 94, f"获取代码文件数据...")
        
        # 获取代码文件数据
        code_files = get_code_files(conn, repository_ids)
        
        # 更新进度到96%
        if task_id and conn:
            update_task_status(conn, task_id, 'running', 96, f"统计包和函数使用情况...")
        
        # 统计包/库使用情况
        packages = {}
        for file in code_files:
            if file['packages']:
                for pkg in file['packages']:
                    packages[pkg] = packages.get(pkg, 0) + 1
        
        # 统计函数使用情况
        functions = {}
        for file in code_files:
            if file['functions']:
                for func in file['functions']:
                    functions[func] = functions.get(func, 0) + 1
        
        # 提取评论
        comments = ' '.join([file['comments'] for file in code_files if file['comments']])
        
        # 提取注释中的关键词
        comment_keywords = {}
        if comments:
            try:
                # 分词处理，简单实现
                # 移除常见标点符号和特殊字符
                import re
                
                # 移除特殊字符
                cleaned_text = re.sub(r'[^\w\s]', ' ', comments.lower())
                
                # 分词并计数
                words = cleaned_text.split()
                
                # 过滤掉停用词和太短的词
                stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 
                              'at', 'from', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 
                              'through', 'during', 'before', 'after', 'above', 'below', 'to', 'of', 'in',
                              'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
                              'there', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
                              'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
                              'too', 'very', 'can', 'will', 'just', 'should', 'now', 'this', 'that',
                              'these', 'those', 'new', 'old', 'high', 'low', 'use', 'using', 'used',
                              'method', 'function', 'returns', 'return', 'param', 'parameter', 'params',
                              'parameters', 'class', 'implements', 'extends', 'import', 'as', 'is', 'are',
                              'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having',
                              'do', 'does', 'did', 'doing', 'it', 'its', 'itself', 'they', 'them',
                              'their', 'theirs', 'you', 'your', 'yours', 'he', 'him', 'his', 'she',
                              'her', 'hers', 'we', 'us', 'our', 'ours', 'i', 'me', 'my', 'mine'}
                
                filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
                
                # 获取词频前50的词
                word_counter = Counter(filtered_words)
                word_counts = word_counter.most_common(50)
                for word, count in word_counts:
                    comment_keywords[word] = count
                    
            except Exception as e:
                logger.error(f"提取注释关键词失败: {e}")
                logger.error(traceback.format_exc())
        
        # 创建分析结果
        analysis_result = {
            'keyword': keyword,
            'repository_count': len(repositories),
            'analysis_date': datetime.datetime.now().isoformat(),
            'charts': {
                'language_distribution': {
                    'data': language_distribution,
                    'chart_path': f'/analytics/language_{safe_keyword}.png' 
                },
                'stars_distribution': {
                    'data': stars_stats,
                    'chart_path': f'/analytics/stars_{safe_keyword}.png'
                },
                'common_packages': {
                    'data': dict(Counter(packages).most_common(20)),
                    'chart_path': f'/analytics/packages_{safe_keyword}.png'
                },
                'common_functions': {
                    'data': dict(Counter(functions).most_common(20)),
                    'chart_path': f'/analytics/functions_{safe_keyword}.png'
                },
                'comment_wordcloud': {
                    'chart_path': f'/analytics/wordcloud_{safe_keyword}.png'
                },
                'comment_keywords': {
                    'data': comment_keywords
                }
            }
        }
        
        # 保存分析结果到JSON文件
        result_file = os.path.join(output_dir, f'analysis_{safe_keyword}.json')
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(analysis_result, f, ensure_ascii=False, indent=2)
        
        # 生成图表
        try:
            import matplotlib.pyplot as plt
            from wordcloud import WordCloud
            
            # 创建语言分布图
            if language_distribution:
                plt.figure(figsize=(10, 6))
                plt.bar(language_distribution.keys(), language_distribution.values())
                plt.title(f'语言分布 - {keyword}')
                plt.xlabel('编程语言')
                plt.ylabel('仓库数量')
                plt.xticks(rotation=45)
                plt.tight_layout()
                plt.savefig(os.path.join(output_dir, f'language_{safe_keyword}.png'))
                plt.close()
            
            # 创建星标分布图
            if stars:
                plt.figure(figsize=(8, 5))
                plt.bar(['最小值', '平均值', '最大值'], [stars_stats['min'], stars_stats['mean'], stars_stats['max']])
                plt.title(f'星标统计 - {keyword}')
                plt.ylabel('星标数')
                plt.savefig(os.path.join(output_dir, f'stars_{safe_keyword}.png'))
                plt.close()
            
            # 创建常用包图表
            if packages:
                top_packages = dict(Counter(packages).most_common(10))
                plt.figure(figsize=(10, 6))
                plt.barh(list(reversed(list(top_packages.keys()))), list(reversed(list(top_packages.values()))))
                plt.title(f'常用包/库 - {keyword}')
                plt.xlabel('使用数量')
                plt.tight_layout()
                plt.savefig(os.path.join(output_dir, f'packages_{safe_keyword}.png'))
                plt.close()
            
            # 创建常用函数图表
            if functions:
                top_functions = dict(Counter(functions).most_common(10))
                plt.figure(figsize=(10, 6))
                plt.barh(list(reversed(list(top_functions.keys()))), list(reversed(list(top_functions.values()))))
                plt.title(f'常用函数 - {keyword}')
                plt.xlabel('使用数量')
                plt.tight_layout()
                plt.savefig(os.path.join(output_dir, f'functions_{safe_keyword}.png'))
                plt.close()
            
            # 创建词云
            if comments:
                wordcloud = WordCloud(width=800, height=400, background_color='white').generate(comments)
                plt.figure(figsize=(10, 5))
                plt.imshow(wordcloud, interpolation='bilinear')
                plt.axis('off')
                plt.savefig(os.path.join(output_dir, f'wordcloud_{safe_keyword}.png'))
                plt.close()
                
            logger.info("图表生成完成")
        except Exception as e:
            logger.error(f"生成图表时出错: {e}")
            logger.error(traceback.format_exc())
        
        # 更新任务状态
        if task_id and conn:
            update_task_status(conn, task_id, 'completed', 100, f"分析完成")
        
        logger.info(f"分析结果已保存到 {result_file}")
        return analysis_result
        
    except Exception as e:
        logger.error(f"生成分析结果失败: {e}")
        logger.error(traceback.format_exc())
        if task_id and conn:
            update_task_status(conn, task_id, 'failed', 90, f"分析过程出错: {str(e)[:200]}")
        return None

# 主函数
def main():
    parser = argparse.ArgumentParser(description='GitHub仓库数据分析')
    parser.add_argument('--keywords', type=str, required=True, help='要分析的关键词，多个关键词用逗号分隔')
    parser.add_argument('--task-id', type=int, help='任务ID，用于更新任务状态')
    
    args = parser.parse_args()
    keywords = [k.strip() for k in args.keywords.split(',')]
    task_id = args.task_id
    
    conn = get_db_connection()
    
    try:
        for keyword in keywords:
            logger.info(f"开始分析关键词: {keyword}")
            
            # 获取该关键词的仓库数据
            data = get_repositories_for_keyword(conn, keyword)
            
            if not data or not data['repositories']:
                logger.warning(f"没有找到关键词 '{keyword}' 的仓库数据")
                if task_id:
                    update_task_status(conn, task_id, 'failed', 90, f"没有找到关键词 '{keyword}' 的仓库数据")
                continue
            
            # 生成分析结果
            generate_and_save_analysis(data, ANALYTICS_DIR, keyword, task_id, conn)
            
    except Exception as e:
        logger.error(f"分析过程出错: {e}")
        logger.error(traceback.format_exc())
        if task_id:
            update_task_status(conn, task_id, 'failed', 90, f"分析过程出错: {str(e)[:200]}")
    finally:
        conn.close()

if __name__ == "__main__":
    main() 