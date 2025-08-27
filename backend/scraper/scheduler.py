#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
定时任务调度器（重构后版本）
管理 GitHub 趋势爬虫的定时执行
"""

import os
import sys
import time
import logging
import schedule
import asyncio
from pathlib import Path
from datetime import datetime

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.scraper.main import GitHubTrendingScraper

# 配置日志
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('scheduler.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

class TrendingScheduler:
    """GitHub 趋势爬虫调度器"""
    
    def __init__(self):
        self.scraper = GitHubTrendingScraper()
        
    async def run_daily_job(self):
        """执行每日爬取任务"""
        try:
            logger.info("开始执行每日爬取任务...")

            # 使用新的综合趋势方法获取更多数据
            daily_repos = await self.scraper.trending_crawler.get_comprehensive_trending(
                period='daily'
            )

            logger.info(f"每日爬取任务完成，获取 {len(daily_repos)} 个仓库")

            # 保存数据到文件（这里可以根据需要调整保存逻辑）
            await self._save_trending_data(daily_repos, 'daily')

        except Exception as e:
            logger.error(f"每日爬取任务异常: {e}")
    
    async def run_weekly_job(self):
        """执行每周爬取任务"""
        try:
            logger.info("开始执行每周爬取任务...")

            # 使用综合趋势方法获取每周数据
            weekly_repos = await self.scraper.trending_crawler.get_comprehensive_trending(
                period='weekly'
            )

            logger.info(f"每周爬取任务完成，获取 {len(weekly_repos)} 个仓库")

            # 保存数据
            await self._save_trending_data(weekly_repos, 'weekly')

        except Exception as e:
            logger.error(f"每周爬取任务异常: {e}")
    
    async def run_monthly_job(self):
        """执行每月爬取任务"""
        try:
            logger.info("开始执行每月爬取任务...")

            # 使用综合趋势方法获取每月数据
            monthly_repos = await self.scraper.trending_crawler.get_comprehensive_trending(
                period='monthly'
            )

            # 保存数据
            await self._save_trending_data(monthly_repos, 'monthly')

            # 执行关键词分析
            keywords = ['react', 'vue', 'python', 'javascript', 'machine-learning', 'ai', 'blockchain',
                       'typescript', 'rust', 'go', 'docker', 'kubernetes', 'nextjs', 'tailwindcss']
            keyword_results = await self.scraper.run_keyword_analysis(keywords)

            logger.info(f"每月爬取任务完成，获取 {len(monthly_repos)} 个仓库，分析 {len(keyword_results)} 个关键词")

        except Exception as e:
            logger.error(f"每月爬取任务异常: {e}")

    async def _save_trending_data(self, repositories, period):
        """保存趋势数据到文件"""
        try:
            import json
            from pathlib import Path

            # 1. 保存到数据目录（备份）
            data_dir = Path('data/trending')
            data_dir.mkdir(parents=True, exist_ok=True)

            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{period}_trending_{timestamp}.json"
            filepath = data_dir / filename

            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump({
                    'period': period,
                    'timestamp': datetime.now().isoformat(),
                    'count': len(repositories),
                    'repositories': repositories
                }, f, ensure_ascii=False, indent=2)

            logger.info(f"趋势数据已保存到: {filepath}")

            # 2. 更新API使用的trends.json文件
            await self._update_trends_json(repositories, period)

        except Exception as e:
            logger.error(f"保存趋势数据失败: {e}")

    async def _update_trends_json(self, repositories, period):
        """更新API使用的trends.json文件"""
        try:
            import json
            from pathlib import Path

            # API数据文件路径
            api_data_dir = Path('public/analytics')
            api_data_dir.mkdir(parents=True, exist_ok=True)
            trends_file = api_data_dir / 'trends.json'

            # 读取现有数据
            existing_data = {}
            if trends_file.exists():
                try:
                    with open(trends_file, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                except Exception as e:
                    logger.warning(f"读取现有trends.json失败: {e}")

            # 转换数据格式以匹配API期望的格式
            formatted_repos = []
            for repo in repositories:
                formatted_repo = {
                    'id': repo.get('id'),
                    'name': repo.get('name'),
                    'owner': repo.get('owner', {}).get('login') if isinstance(repo.get('owner'), dict) else repo.get('owner'),
                    'fullName': repo.get('full_name'),
                    'description': repo.get('description'),
                    'language': repo.get('language'),
                    'stars': repo.get('stargazers_count', 0),
                    'forks': repo.get('forks_count', 0),
                    'todayStars': repo.get('today_stars', 0),
                    'url': repo.get('html_url'),
                    'createdAt': repo.get('created_at'),
                    'updatedAt': repo.get('updated_at'),
                    'trendPeriod': period
                }
                formatted_repos.append(formatted_repo)

            # 更新对应时间段的数据
            existing_data[period] = formatted_repos
            existing_data['lastUpdated'] = datetime.now().isoformat()

            # 保存更新后的数据
            with open(trends_file, 'w', encoding='utf-8') as f:
                json.dump(existing_data, f, ensure_ascii=False, indent=2)

            logger.info(f"API趋势数据已更新: {trends_file} ({len(formatted_repos)} 个{period}项目)")

        except Exception as e:
            logger.error(f"更新API趋势数据失败: {e}")

    def job_wrapper(self, job_func):
        """异步任务包装器"""
        def wrapper():
            try:
                asyncio.run(job_func())
            except Exception as e:
                logger.error(f"任务执行失败: {e}")
        return wrapper
    
    def start_scheduler(self):
        """启动定时任务调度器"""
        logger.info("正在启动 GitHub 趋势爬虫调度器...")
        
        # 每天凌晨2点执行每日爬取任务
        schedule.every().day.at("02:00").do(self.job_wrapper(self.run_daily_job))
        logger.info("已安排每日任务: 每天 02:00")
        
        # 每周一凌晨3点执行每周爬取任务
        schedule.every().monday.at("03:00").do(self.job_wrapper(self.run_weekly_job))
        logger.info("已安排每周任务: 每周一 03:00")
        
        # 每月1号凌晨4点执行每月爬取任务
        def monthly_guard():
            if datetime.now().day == 1:
                asyncio.run(self.run_monthly_job())
        
        schedule.every().day.at("04:00").do(monthly_guard)
        logger.info("已安排每月任务: 每月1号 04:00")
        
        # 检查 API 状态任务
        def check_api_status():
            try:
                status = self.scraper.get_rate_limit_status()
                if status:
                    remaining = status.get('remaining', 0)
                    limit = status.get('limit', 0)
                    logger.info(f"API 状态检查: {remaining}/{limit} 剩余")
                else:
                    logger.warning("API 状态检查失败")
            except Exception as e:
                logger.error(f"API 状态检查异常: {e}")
        
        # 每小时检查一次 API 状态
        schedule.every().hour.do(check_api_status)
        logger.info("已安排 API 状态检查: 每小时")
        
        logger.info("定时任务调度器启动完成")
        
        # 立即执行一次每日任务获取初始数据
        logger.info("执行初始数据获取...")
        try:
            asyncio.run(self.run_daily_job())
        except Exception as e:
            logger.error(f"初始数据获取失败: {e}")
        
        # 持续运行调度器
        logger.info("开始监听定时任务...")
        while True:
            try:
                schedule.run_pending()
                time.sleep(60)  # 每分钟检查一次
            except KeyboardInterrupt:
                logger.info("收到中断信号，正在停止调度器...")
                break
            except Exception as e:
                logger.error(f"调度器运行异常: {e}")
                time.sleep(60)
        
        logger.info("定时任务调度器已停止")

def main():
    """主函数"""
    scheduler = TrendingScheduler()
    scheduler.start_scheduler()

if __name__ == "__main__":
    main()
