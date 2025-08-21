#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
数据分析器（重构后版本）
分析爬取的 GitHub 数据并生成统计报告
"""

import os
import sys
import time
import json
import argparse
import traceback
import datetime
import logging
from pathlib import Path
from collections import Counter, defaultdict

# 设置控制台编码，解决Windows乱码问题
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())
from typing import Dict, List, Any, Optional, Tuple

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('data_analysis.log', encoding='utf-8')
    ]
)
logger = logging.getLogger('data_analysis')

class GitHubDataAnalyzer:
    """GitHub 数据分析器"""
    
    def __init__(self):
        self.data = []
        self.analysis_results = {}
        
    def load_data_from_json(self, file_path: str) -> bool:
        """从 JSON 文件加载数据"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            logger.info(f"成功加载 {len(self.data)} 条数据")
            return True
        except Exception as e:
            logger.error(f"加载数据失败: {e}")
            return False
    
    def analyze_languages(self) -> Dict[str, Any]:
        """分析编程语言分布"""
        logger.info("开始分析编程语言分布...")
        
        language_stats = Counter()
        language_stars = defaultdict(int)
        language_repos = defaultdict(list)
        
        for repo in self.data:
            language = repo.get('language')
            if language:
                language_stats[language] += 1
                language_stars[language] += repo.get('stargazers_count', 0)
                language_repos[language].append(repo)
        
        # 计算平均星数
        language_avg_stars = {}
        for lang, total_stars in language_stars.items():
            count = language_stats[lang]
            language_avg_stars[lang] = total_stars / count if count > 0 else 0
        
        result = {
            'total_languages': len(language_stats),
            'language_distribution': dict(language_stats.most_common()),
            'language_stars': dict(language_stars),
            'language_avg_stars': language_avg_stars,
            'top_languages': language_stats.most_common(10),
            'analyzed_at': datetime.datetime.now().isoformat()
        }
        
        self.analysis_results['languages'] = result
        logger.info(f"语言分析完成，发现 {len(language_stats)} 种语言")
        return result
    
    def analyze_topics(self) -> Dict[str, Any]:
        """分析主题标签分布"""
        logger.info("开始分析主题标签分布...")

        topic_stats = Counter()
        topic_repos = defaultdict(list)

        for repo in self.data:
            # 检查 tags 字段（数据库中实际存储的字段）
            tags = repo.get('tags', [])
            # 也检查 topics 字段（兼容性）
            topics = repo.get('topics', [])

            # 合并两个字段的数据
            all_topics = []
            if tags and isinstance(tags, list):
                all_topics.extend(tags)
            if topics and isinstance(topics, list):
                all_topics.extend(topics)

            if all_topics:
                for topic in all_topics:
                    if topic and isinstance(topic, str):  # 确保是有效的字符串
                        topic_stats[topic] += 1
                        topic_repos[topic].append(repo)

        result = {
            'total_topics': len(topic_stats),
            'topic_distribution': dict(topic_stats.most_common()),
            'top_topics': topic_stats.most_common(20),
            'analyzed_at': datetime.datetime.now().isoformat()
        }

        self.analysis_results['topics'] = result
        logger.info(f"主题分析完成，发现 {len(topic_stats)} 个主题")
        return result
    
    def analyze_stars_distribution(self) -> Dict[str, Any]:
        """分析星数分布"""
        logger.info("开始分析星数分布...")

        # 兼容不同的星标字段名
        stars_list = []
        for repo in self.data:
            stars = repo.get('stargazers_count') or repo.get('stars', 0)
            stars_list.append(stars)
        stars_list.sort(reverse=True)
        
        # 分段统计
        ranges = [
            (0, 10, '0-10'),
            (11, 100, '11-100'),
            (101, 1000, '101-1K'),
            (1001, 10000, '1K-10K'),
            (10001, 100000, '10K-100K'),
            (100001, float('inf'), '100K+')
        ]
        
        range_stats = {}
        for min_val, max_val, label in ranges:
            count = sum(1 for stars in stars_list if min_val <= stars <= max_val)
            range_stats[label] = count
        
        result = {
            'total_repositories': len(stars_list),
            'max_stars': max(stars_list) if stars_list else 0,
            'min_stars': min(stars_list) if stars_list else 0,
            'avg_stars': sum(stars_list) / len(stars_list) if stars_list else 0,
            'median_stars': stars_list[len(stars_list)//2] if stars_list else 0,
            'stars_distribution': range_stats,
            'top_starred': stars_list[:10],
            'analyzed_at': datetime.datetime.now().isoformat()
        }
        
        self.analysis_results['stars'] = result
        logger.info("星数分析完成")
        return result
    
    def analyze_creation_trends(self) -> Dict[str, Any]:
        """分析创建时间趋势"""
        logger.info("开始分析创建时间趋势...")
        
        creation_dates = []
        monthly_stats = defaultdict(int)
        yearly_stats = defaultdict(int)
        
        for repo in self.data:
            created_at = repo.get('created_at')
            if created_at:
                try:
                    # 解析日期
                    date = datetime.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    creation_dates.append(date)
                    
                    # 按月统计
                    month_key = date.strftime('%Y-%m')
                    monthly_stats[month_key] += 1
                    
                    # 按年统计
                    year_key = date.strftime('%Y')
                    yearly_stats[year_key] += 1
                    
                except Exception as e:
                    logger.warning(f"解析日期失败: {created_at}, {e}")
        
        result = {
            'total_with_dates': len(creation_dates),
            'earliest_date': min(creation_dates).isoformat() if creation_dates else None,
            'latest_date': max(creation_dates).isoformat() if creation_dates else None,
            'monthly_distribution': dict(sorted(monthly_stats.items())),
            'yearly_distribution': dict(sorted(yearly_stats.items())),
            'analyzed_at': datetime.datetime.now().isoformat()
        }
        
        self.analysis_results['creation_trends'] = result
        logger.info("创建时间趋势分析完成")
        return result
    
    def analyze_repository_sizes(self) -> Dict[str, Any]:
        """分析仓库大小分布"""
        logger.info("开始分析仓库大小分布...")
        
        sizes = [repo.get('size', 0) for repo in self.data]
        sizes = [s for s in sizes if s > 0]  # 过滤掉0值
        
        if not sizes:
            return {'error': '没有有效的大小数据'}
        
        sizes.sort(reverse=True)
        
        # 分段统计 (KB)
        ranges = [
            (0, 100, '0-100KB'),
            (101, 1000, '100KB-1MB'),
            (1001, 10000, '1-10MB'),
            (10001, 100000, '10-100MB'),
            (100001, float('inf'), '100MB+')
        ]
        
        range_stats = {}
        for min_val, max_val, label in ranges:
            count = sum(1 for size in sizes if min_val <= size <= max_val)
            range_stats[label] = count
        
        result = {
            'total_repositories': len(sizes),
            'max_size_kb': max(sizes),
            'min_size_kb': min(sizes),
            'avg_size_kb': sum(sizes) / len(sizes),
            'median_size_kb': sizes[len(sizes)//2],
            'size_distribution': range_stats,
            'analyzed_at': datetime.datetime.now().isoformat()
        }
        
        self.analysis_results['sizes'] = result
        logger.info("仓库大小分析完成")
        return result
    
    def generate_summary_report(self) -> Dict[str, Any]:
        """生成综合分析报告 - 使用标准格式"""
        logger.info("生成综合分析报告...")

        # 运行所有分析
        self.analyze_languages()
        self.analyze_topics()
        self.analyze_stars_distribution()
        self.analyze_creation_trends()
        self.analyze_repository_sizes()

        # 分析代码文件数据
        code_analysis = self._analyze_code_files()

        # 生成标准格式的摘要
        summary = {
            'keyword': getattr(self, 'keyword', 'unknown'),
            'repository_count': len(self.data),
            'analysis_date': datetime.datetime.now().isoformat(),
            'charts': {
                'language_distribution': {
                    'data': self.analysis_results.get('languages', {})
                },
                'stars_distribution': {
                    'data': self.analysis_results.get('stars', {})
                },
                'common_packages': {
                    'data': code_analysis.get('packages', {})
                },
                'imported_libraries': {
                    'data': code_analysis.get('libraries', {})
                },
                'common_functions': {
                    'data': code_analysis.get('functions', {})
                },
                'tag_analysis': {
                    'data': self.analysis_results.get('topics', {})
                }
            },
            # 添加预计算的趋势数据
            'trends': {
                'libraries': code_analysis.get('library_trends', {}),
                'packages': code_analysis.get('package_trends', {}),
                'functions': code_analysis.get('function_trends', {})
            },
            'repositories': self.data  # 包含完整的仓库数据
        }

        # 填充语言分布数据
        if 'languages' in self.analysis_results:
            lang_data = self.analysis_results['languages']
            if 'distribution' in lang_data:
                summary['charts']['language_distribution']['data'] = lang_data['distribution']

        # 填充星数分布数据
        if 'stars' in self.analysis_results:
            stars_data = self.analysis_results['stars']
            summary['charts']['stars_distribution']['data'] = {
                'mean': stars_data.get('avg_stars', 0),
                'min': stars_data.get('min_stars', 0),
                'max': stars_data.get('max_stars', 0),
                'total': stars_data.get('total_stars', 0)
            }

        # 填充主题分析数据
        if 'topics' in self.analysis_results:
            topics_data = self.analysis_results['topics']
            if 'distribution' in topics_data:
                summary['charts']['tag_analysis']['data'] = topics_data['distribution']

        return summary

    def _analyze_code_files(self) -> Dict[str, Dict[str, int]]:
        """分析代码文件数据"""
        logger.info("开始分析代码文件数据...")

        # 获取数据库连接
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # 获取所有仓库ID
            repo_ids = [repo['id'] for repo in self.data]
            if not repo_ids:
                return {'libraries': {}, 'packages': {}, 'functions': {}}

            # 查询代码文件数据
            placeholders = ','.join(['%s'] * len(repo_ids))
            query = f'''
                SELECT "importedLibraries", packages, functions
                FROM "code_files"
                WHERE repository_id IN ({placeholders})
            '''

            cursor.execute(query, repo_ids)
            rows = cursor.fetchall()

            # 统计数据
            all_libraries = []
            all_packages = []
            all_functions = []

            for row in rows:
                imported_libs = row[0] if row[0] else []
                packages = row[1] if row[1] else []
                functions = row[2] if row[2] else []

                all_libraries.extend(imported_libs)
                all_packages.extend(packages)
                all_functions.extend(functions)

            # 统计频次并取前20
            library_count = dict(Counter(all_libraries).most_common(20))
            package_count = dict(Counter(all_packages).most_common(20))
            function_count = dict(Counter(all_functions).most_common(20))

            # 预计算趋势数据
            library_trends = self._calculate_library_trends(library_count)
            package_trends = self._calculate_library_trends(package_count)
            function_trends = self._calculate_library_trends(function_count)

            cursor.close()
            conn.close()

            logger.info(f"代码文件分析完成: {len(library_count)} 个库, {len(package_count)} 个包, {len(function_count)} 个函数")

            return {
                'libraries': library_count,
                'packages': package_count,
                'functions': function_count,
                'library_trends': library_trends,
                'package_trends': package_trends,
                'function_trends': function_trends
            }

        except Exception as e:
            logger.error(f"分析代码文件失败: {e}")
            return {'libraries': {}, 'packages': {}, 'functions': {}}

    def _calculate_library_trends(self, library_data: Dict[str, int]) -> Dict[str, Dict[str, Any]]:
        """计算库的趋势数据"""
        if not library_data:
            return {}

        counts = list(library_data.values())
        if len(counts) == 0:
            return {}

        # 计算统计指标
        sorted_counts = sorted(counts)
        n = len(sorted_counts)

        # 计算中位数
        median = sorted_counts[n//2] if n % 2 == 1 else (sorted_counts[n//2-1] + sorted_counts[n//2]) / 2

        # 计算四分位数
        q1_idx = n // 4
        q3_idx = 3 * n // 4
        q1 = sorted_counts[q1_idx]
        q3 = sorted_counts[q3_idx]

        # 计算平均值和标准差
        mean = sum(counts) / n
        variance = sum((x - mean) ** 2 for x in counts) / n
        std_dev = variance ** 0.5

        # 计算异常值阈值
        iqr = q3 - q1
        outlier_lower = q1 - 1.5 * iqr
        outlier_upper = q3 + 1.5 * iqr

        # 为每个库计算趋势
        trends = {}
        for name, count in library_data.items():
            # 基于统计指标判断趋势
            if count >= outlier_upper:
                trend = 'up'
            elif count <= outlier_lower:
                trend = 'down'
            elif count >= q3:
                trend = 'up'
            elif count >= median:
                trend = 'stable'
            elif count >= q1:
                trend = 'stable'
            else:
                trend = 'down'

            trends[name] = {
                'trend': trend,
                'count': count,
                'percentile': self._calculate_percentile(count, sorted_counts),
                'category': self._get_library_category(name)
            }

        return trends

    def _calculate_percentile(self, value: int, sorted_values: List[int]) -> float:
        """计算值在排序列表中的百分位数"""
        if not sorted_values:
            return 0.0

        count_below = sum(1 for v in sorted_values if v < value)
        count_equal = sum(1 for v in sorted_values if v == value)

        # 使用平均排名方法
        percentile = (count_below + count_equal / 2) / len(sorted_values) * 100
        return round(percentile, 1)

    def _get_library_category(self, library_name: str) -> str:
        """根据库名推断分类"""
        library_name_lower = library_name.lower()

        # Web框架
        if library_name_lower in ['react', 'vue', 'angular', 'express', 'flask', 'django', 'spring']:
            return 'web-framework'

        # 数据库
        elif library_name_lower in ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite']:
            return 'database'

        # 工具库
        elif library_name_lower in ['lodash', 'axios', 'requests', 'numpy', 'pandas']:
            return 'utility'

        # 测试
        elif library_name_lower in ['jest', 'mocha', 'pytest', 'junit']:
            return 'testing'

        # 构建工具
        elif library_name_lower in ['webpack', 'vite', 'babel', 'typescript']:
            return 'build-tool'

        # 默认分类
        else:
            return 'other'

    def _generate_insights(self) -> List[str]:
        """生成关键洞察"""
        insights = []
        
        # 语言洞察
        if 'languages' in self.analysis_results:
            lang_data = self.analysis_results['languages']
            top_lang = lang_data['top_languages'][0] if lang_data['top_languages'] else None
            if top_lang:
                insights.append(f"最受欢迎的编程语言是 {top_lang[0]}，占 {top_lang[1]} 个仓库")
        
        # 星数洞察
        if 'stars' in self.analysis_results:
            stars_data = self.analysis_results['stars']
            avg_stars = stars_data['avg_stars']
            insights.append(f"平均星数为 {avg_stars:.1f}")
        
        # 主题洞察
        if 'topics' in self.analysis_results:
            topics_data = self.analysis_results['topics']
            top_topic = topics_data['top_topics'][0] if topics_data['top_topics'] else None
            if top_topic:
                insights.append(f"最热门的主题是 '{top_topic[0]}'，出现在 {top_topic[1]} 个仓库中")
        
        return insights
    
    def save_analysis(self, output_path: str) -> bool:
        """保存分析结果"""
        try:
            summary = self.generate_summary_report()
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)
            
            logger.info(f"分析结果已保存到: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"保存分析结果失败: {e}")
            return False

def get_db_connection():
    """获取数据库连接（优先使用环境变量，其次读取 .env，最后回退到本地默认）"""
    import psycopg2
    from pathlib import Path

    # 1) 优先读取环境变量
    DB_URL = os.environ.get('DATABASE_URL', '').strip()

    # 2) 次优从 .env 读取（使用 UTF-8 编码，忽略注释与引号）
    if not DB_URL:
        env_path = Path(__file__).parent.parent.parent.parent / '.env'
        if env_path.exists():
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for raw_line in f:
                        line = raw_line.strip()
                        if not line or line.startswith('#'):
                            continue
                        if line.startswith('DATABASE_URL='):
                            DB_URL = line.split('=', 1)[1].strip().strip('"').strip("'")
                            break
            except Exception as e:
                logger.warning(f"读取 .env 失败: {e}")

    # 3) 仍未获取则使用本地默认（开发环境）
    if not DB_URL:
        DB_URL = 'postgresql://postgres:123456@localhost:5432/github_trending'
        logger.warning('未配置 DATABASE_URL，使用本地默认连接字符串')

    try:
        # 避免在日志中完整打印凭据，仅输出前缀
        try:
            safe_prefix = DB_URL.split('@')[0] + '@...'
        except Exception:
            safe_prefix = DB_URL[:50] + '...'
        logger.info(f"使用数据库连接字符串: {safe_prefix}")

        conn = psycopg2.connect(DB_URL)
        # 尝试设置客户端编码为 UTF8，防止读取中文出错
        try:
            with conn.cursor() as cur:
                cur.execute("SET client_encoding TO 'UTF8'")
        except Exception:
            pass
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        raise

def load_data_from_database(keywords, task_id=None):
    """从数据库加载关键词相关的仓库数据"""
    import psycopg2
    import os
    from pathlib import Path

    # 获取数据库连接
    DB_URL = os.environ.get('DATABASE_URL', '').strip()
    if not DB_URL:
        # 从 .env 文件读取（优先 UTF-8，失败则尝试系统编码）
        env_path = Path(__file__).parent.parent.parent.parent / '.env'
        if env_path.exists():
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for raw_line in f:
                        line = raw_line.strip()
                        if not line or line.startswith('#'):
                            continue
                        if line.startswith('DATABASE_URL='):
                            DB_URL = line.split('=', 1)[1].strip().strip('"').strip("'")
                            break
            except UnicodeDecodeError:
                try:
                    # Windows 常见本地编码
                    with open(env_path, 'r', encoding=('mbcs' if os.name == 'nt' else 'utf-8'), errors='ignore') as f:
                        for raw_line in f:
                            line = raw_line.strip()
                            if not line or line.startswith('#'):
                                continue
                            if line.startswith('DATABASE_URL='):
                                DB_URL = line.split('=', 1)[1].strip().strip('"').strip("'")
                                break
                except Exception as e:
                    logger.warning(f"读取 .env 失败: {e}")

    if not DB_URL:
        logger.error("未找到数据库连接字符串")
        return []

    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()

        # 查询关键词相关的仓库数据
        if isinstance(keywords, str):
            keywords = [keywords]

        placeholders = ','.join(['%s'] * len(keywords))
        query = f'''
            SELECT DISTINCT r.id, r.name, r.full_name, r.owner, r.description,
                   r.url, r.language, r.stars, r.forks, r.tags,
                   r.created_at, r.updated_at, r.trend_date,
                   k.text as keyword, rk.created_at as scraped_at
            FROM "repositories" r
            JOIN "repository_keywords" rk ON r.id = rk."repositoryId"
            JOIN "keywords" k ON rk."keywordId" = k.id
            WHERE k.text IN ({placeholders})
            ORDER BY r.stars DESC
        '''

        cursor.execute(query, keywords)
        rows = cursor.fetchall()

        # 转换为字典格式（与分析器期望的格式一致）
        repositories = []
        for row in rows:
            repo = {
                'id': row[0],
                'name': row[1],
                'full_name': row[2],
                'owner': row[3],
                'description': row[4] or '',
                'url': row[5],  # 使用 url 而不是 html_url
                'language': row[6],
                'stars': row[7] or 0,  # 使用 stars 而不是 stargazers_count
                'forks': row[8] or 0,  # 使用 forks 而不是 forks_count
                'tags': row[9] or [],
                'created_at': row[10].isoformat() if row[10] else None,
                'updated_at': row[11].isoformat() if row[11] else None,
                'trend_date': row[12].isoformat() if row[12] else None,
                'keyword': row[13],
                'scraped_at': row[14].isoformat() if row[14] else None
            }
            repositories.append(repo)

        cursor.close()
        conn.close()

        logger.info(f"从数据库加载了 {len(repositories)} 个仓库数据")
        return repositories

    except Exception as e:
        logger.error(f"从数据库加载数据失败: {e}")
        return []

def update_task_status(conn, task_id, status, progress, message=None):
    """更新任务状态"""
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

            # 构建SQL语句（使用双引号包围字段名）
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

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='GitHub 数据分析器')
    parser.add_argument('--keywords', type=str, help='要分析的关键词，多个关键词用逗号分隔')
    parser.add_argument('--task-id', type=int, help='任务ID，用于更新任务状态')
    parser.add_argument('--input-file', help='输入的 JSON 数据文件（可选，优先使用数据库数据）')
    parser.add_argument('--output', '-o', help='输出文件路径（可选）')

    args = parser.parse_args()

    # 获取数据库连接
    conn = get_db_connection()

    # 更新任务状态
    if args.task_id:
        update_task_status(conn, args.task_id, 'running', 85, '开始数据分析...')

    try:
        # 优先从数据库加载数据
        if args.keywords:
            keywords = [k.strip() for k in args.keywords.split(',')]
            logger.info(f"从数据库加载关键词数据: {keywords}")
            repositories = load_data_from_database(keywords, args.task_id)

            if not repositories:
                logger.warning("未找到相关数据，分析终止")
                if args.task_id:
                    update_task_status(conn, args.task_id, 'failed', 85, '未找到相关数据')
                conn.close()
                return

            # 创建临时数据文件用于分析
            temp_data_file = f"temp_analysis_data_{args.task_id or 'manual'}.json"
            with open(temp_data_file, 'w', encoding='utf-8') as f:
                json.dump(repositories, f, ensure_ascii=False, indent=2)

            # 创建分析器并加载数据
            analyzer = GitHubDataAnalyzer()
            analyzer.keyword = keywords[0] if keywords else 'unknown'  # 设置关键词
            if not analyzer.load_data_from_json(temp_data_file):
                if args.task_id:
                    update_task_status(conn, args.task_id, 'failed', 85, '加载数据失败')
                conn.close()
                return

        elif args.input_file:
            # 从文件加载数据（兼容旧版本）
            if not os.path.exists(args.input_file):
                logger.error(f"输入文件不存在: {args.input_file}")
                if args.task_id:
                    update_task_status(conn, args.task_id, 'failed', 85, f'输入文件不存在: {args.input_file}')
                conn.close()
                return

            analyzer = GitHubDataAnalyzer()
            if not analyzer.load_data_from_json(args.input_file):
                if args.task_id:
                    update_task_status(conn, args.task_id, 'failed', 85, '加载数据失败')
                conn.close()
                return

        else:
            logger.error("必须提供 --keywords 或 --input-file 参数")
            if args.task_id:
                update_task_status(conn, args.task_id, 'failed', 85, '缺少必要参数')
            conn.close()
            return

        # 运行分析
        logger.info("开始生成分析报告...")
        # 注意：这里不需要summary变量，直接调用即可
        analyzer.generate_summary_report()

        # 保存分析结果
        if args.output:
            output_file = args.output
        elif args.keywords:
            # 基于关键词生成输出文件名
            keyword_str = '_'.join(keywords).replace(' ', '_')
            output_file = f"analysis_{keyword_str}.json"
        else:
            output_file = "analysis_report.json"

        # 保存到public/analytics目录
        analytics_dir = Path(__file__).parent.parent.parent.parent / 'public' / 'analytics'
        analytics_dir.mkdir(parents=True, exist_ok=True)
        final_output_path = analytics_dir / output_file

        if analyzer.save_analysis(str(final_output_path)):
            logger.info(f"数据分析完成！结果保存到: {final_output_path}")
            if args.task_id:
                update_task_status(conn, args.task_id, 'completed', 100, '数据分析完成')
        else:
            logger.error("保存分析结果失败！")
            if args.task_id:
                update_task_status(conn, args.task_id, 'failed', 90, '保存分析结果失败')

        # 清理临时文件
        if args.keywords and 'temp_data_file' in locals() and os.path.exists(temp_data_file):
            os.remove(temp_data_file)

    except Exception as e:
        logger.error(f"数据分析过程中出错: {e}")
        logger.error(traceback.format_exc())
        if args.task_id:
            update_task_status(conn, args.task_id, 'failed', 85, f'分析过程出错: {str(e)[:200]}')
    finally:
        conn.close()

if __name__ == "__main__":
    main()
