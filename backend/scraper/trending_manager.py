#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
GitHub 趋势数据管理器
统一管理每日、每周、每月的趋势数据
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional

# 添加项目根目录到 Python 路径
import sys
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 加载.env文件
def load_env_file():
    """手动加载.env文件"""
    env_path = project_root / '.env'
    if env_path.exists():
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if key and value:
                            os.environ[key] = value
            print(f"[SUCCESS] 已加载环境变量文件: {env_path}")
            return True
        except Exception as e:
            print(f"[WARNING] 加载.env文件失败: {e}")
            return False
    else:
        print(f"[WARNING] 未找到.env文件: {env_path}")
        return False

# 尝试加载环境变量
load_env_file()

from backend.scraper.core.api_client import GitHubAPIClient
from backend.scraper.crawlers.github_trending_html import GitHubTrendingHTMLCrawler

logger = logging.getLogger(__name__)

class TrendingDataManager:
    """趋势数据管理器"""
    
    def __init__(self):
        self.api_client = GitHubAPIClient()
        # 使用 GitHub Trending HTML 爬虫作为数据源
        self.crawler = GitHubTrendingHTMLCrawler()
        self.data_dir = Path('public/trends/data')
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
    async def fetch_and_save_all_trends(self):
        """获取并保存所有时间段的趋势数据"""
        logger.info("开始获取所有趋势数据...")
        
        try:
            # 检查API连接
            if not self.api_client.test_connection():
                logger.error("GitHub API 连接失败")
                return False
            
            # 获取三个时间段的数据
            daily_data = await self._fetch_period_data('daily')
            weekly_data = await self._fetch_period_data('weekly') 
            monthly_data = await self._fetch_period_data('monthly')
            
            # 构建完整的趋势数据
            trends_data = {
                'daily': daily_data,
                'weekly': weekly_data,
                'monthly': monthly_data,
                'lastUpdated': datetime.now().isoformat(),
                'metadata': {
                    'dailyCount': len(daily_data),
                    'weeklyCount': len(weekly_data),
                    'monthlyCount': len(monthly_data),
                    'totalCount': len(daily_data) + len(weekly_data) + len(monthly_data)
                }
            }
            
            # 保存到文件
            await self._save_trends_data(trends_data)
            
            logger.info(f"[SUCCESS] 趋势数据获取完成: 日({len(daily_data)}) 周({len(weekly_data)}) 月({len(monthly_data)})")
            return True
            
        except Exception as e:
            logger.error(f"获取趋势数据失败: {e}")
            return False
    
    async def _fetch_period_data(self, period: str) -> List[Dict[str, Any]]:
        """获取指定时间段的趋势数据"""
        logger.info(f"获取 {period} 趋势数据...")

        try:
            all_repos = []

            # 1. 获取全语言趋势数据
            logger.info(f"获取 {period} 全语言趋势数据...")
            general_repos = self.crawler.fetch(period)
            all_repos.extend(general_repos)
            logger.info(f"全语言数据: {len(general_repos)} 个项目")

            # 2. 获取热门语言的趋势数据
            popular_languages = [
                'javascript', 'python', 'java', 'typescript', 'c++', 'c#', 'php',
                'c', 'shell', 'go', 'rust', 'kotlin', 'swift', 'dart', 'ruby',
                'scala', 'r', 'matlab', 'perl', 'lua', 'haskell', 'clojure',
                'vue', 'html', 'css', 'scss', 'less'
            ]

            for lang in popular_languages:
                try:
                    logger.info(f"获取 {period} {lang} 趋势数据...")
                    lang_repos = self.crawler.fetch(period, language=lang)
                    if lang_repos:
                        all_repos.extend(lang_repos)
                        logger.info(f"{lang} 数据: {len(lang_repos)} 个项目")

                    # 添加延迟避免被限制
                    await asyncio.sleep(1)

                except Exception as e:
                    logger.warning(f"获取 {lang} 数据失败: {e}")
                    continue

            # 3. 去重（基于full_name）
            seen = set()
            unique_repos = []
            for repo in all_repos:
                full_name = repo.get('full_name')
                if full_name and full_name not in seen:
                    seen.add(full_name)
                    unique_repos.append(repo)

            logger.info(f"{period} 数据获取完成: {len(unique_repos)} 个去重后的项目")
            return unique_repos

        except Exception as e:
            logger.error(f"获取 {period} 数据失败: {e}")
            return []
    
    async def _get_recent_trending(self, days: int, min_stars: int, max_results: int) -> List[Dict[str, Any]]:
        """获取最近指定天数的趋势项目"""
        since_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # 构建多个查询以获取更多样化的数据
        queries = [
            f'created:>{since_date} stars:>{min_stars}',
            f'pushed:>{since_date} stars:>{min_stars//2}',
            f'created:>{since_date} language:JavaScript stars:>5',
            f'created:>{since_date} language:Python stars:>5',
            f'created:>{since_date} language:TypeScript stars:>5',
        ]
        
        all_repos = []
        seen_repos = set()
        
        for query in queries:
            try:
                # 获取多页数据
                for page in range(1, 3):  # 最多2页
                    search_result = self.api_client.search_repositories(
                        query=query,
                        sort='stars',
                        order='desc',
                        per_page=50,
                        page=page
                    )
                    
                    if not search_result or 'items' not in search_result:
                        break
                    
                    for repo in search_result['items']:
                        repo_key = repo.get('full_name')
                        if repo_key and repo_key not in seen_repos:
                            seen_repos.add(repo_key)
                            all_repos.append(repo)
                            
                            if len(all_repos) >= max_results:
                                break
                    
                    if len(all_repos) >= max_results:
                        break
                    
                    await asyncio.sleep(1)  # 避免速率限制
                
                if len(all_repos) >= max_results:
                    break
                    
                await asyncio.sleep(2)  # 查询间隔
                
            except Exception as e:
                logger.warning(f"查询失败 '{query}': {e}")
                continue
        
        # 按星数排序
        all_repos.sort(key=lambda x: x.get('stargazers_count', 0), reverse=True)
        return all_repos[:max_results]
    
    def _format_repository_data(self, repo: Dict[str, Any], period: str) -> Optional[Dict[str, Any]]:
        """格式化仓库数据"""
        try:
            # 从 HTML 源读取今日增长
            stars = repo.get('stargazers_count', repo.get('stars', 0))
            today = repo.get('today_stars', 0)

            return {
                'id': repo.get('id'),
                'name': repo.get('name'),
                'owner': repo.get('owner', {}).get('login') if isinstance(repo.get('owner'), dict) else str(repo.get('owner', '')),
                'fullName': repo.get('full_name'),
                'description': repo.get('description'),
                'language': repo.get('language'),
                'stars': stars,
                'forks': repo.get('forks_count', repo.get('forks', 0)),
                'todayStars': today,
                'url': repo.get('html_url'),
                'createdAt': repo.get('created_at'),
                'updatedAt': repo.get('updated_at'),
                'pushedAt': repo.get('pushed_at'),
                'topics': repo.get('topics', []),
                'trendPeriod': period,
                'scrapedAt': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"格式化仓库数据失败: {e}")
            return None
    
    async def _save_trends_data(self, data: Dict[str, Any]):
        """保存趋势数据"""
        try:
            # 保存主要的trends.json文件
            trends_file = self.data_dir / 'trends.json'
            with open(trends_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            logger.info(f"趋势数据已保存到: {trends_file}")

            # 同时保存带时间戳的备份文件
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_file = self.data_dir / f'trends_backup_{timestamp}.json'
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            logger.info(f"备份文件已保存到: {backup_file}")

        except Exception as e:
            logger.error(f"保存趋势数据失败: {e}")
    
    def get_rate_limit_status(self) -> Optional[Dict[str, Any]]:
        """获取API速率限制状态"""
        try:
            return self.api_client.get_rate_limit()
        except Exception as e:
            logger.error(f"获取速率限制状态失败: {e}")
            return None

async def main():
    """主函数 - 用于测试和手动执行"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger.info("[START] 启动趋势数据管理器")

    # 使用TokenManager检查环境变量
    from backend.scraper.core.token_manager import GitHubTokenManager

    try:
        token_manager = GitHubTokenManager()
        if not token_manager.tokens:
            logger.error("[ERROR] 未找到GitHub Token环境变量")
            logger.error("请在.env文件中设置GitHub Token变量")
            return

        logger.info(f"[SUCCESS] 加载了 {len(token_manager.tokens)} 个Token")

    except Exception as e:
        logger.error(f"[ERROR] Token管理器初始化失败: {e}")
        return
    
    manager = TrendingDataManager()
    
    # 检查API状态
    rate_limit = manager.get_rate_limit_status()
    if rate_limit:
        remaining = rate_limit.get('remaining', 0)
        limit = rate_limit.get('limit', 0)
        logger.info(f"[INFO] API状态: {remaining}/{limit} 剩余")

        if remaining < 100:
            logger.warning("[WARNING] API调用次数不足，建议稍后再试")
    
    # 执行数据获取
    success = await manager.fetch_and_save_all_trends()
    
    if success:
        logger.info("🎉 趋势数据更新完成！")
    else:
        logger.error("❌ 趋势数据更新失败")

if __name__ == "__main__":
    asyncio.run(main())
