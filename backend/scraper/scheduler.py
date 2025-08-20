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
            success = await self.scraper.run_daily_scraping()
            
            if success:
                logger.info("每日爬取任务执行完成")
            else:
                logger.error("每日爬取任务执行失败")
                
        except Exception as e:
            logger.error(f"每日爬取任务异常: {e}")
    
    async def run_weekly_job(self):
        """执行每周爬取任务"""
        try:
            logger.info("开始执行每周爬取任务...")
            
            # 获取每周趋势
            weekly_repos = await self.scraper.trending_crawler.get_trending_repositories(
                period='weekly',
                max_results=200
            )
            
            logger.info(f"每周爬取任务完成，获取 {len(weekly_repos)} 个仓库")
            
        except Exception as e:
            logger.error(f"每周爬取任务异常: {e}")
    
    async def run_monthly_job(self):
        """执行每月爬取任务"""
        try:
            logger.info("开始执行每月爬取任务...")
            
            # 获取每月趋势
            monthly_repos = await self.scraper.trending_crawler.get_trending_repositories(
                period='monthly',
                max_results=500
            )
            
            # 执行关键词分析
            keywords = ['react', 'vue', 'python', 'javascript', 'machine-learning', 'ai', 'blockchain']
            keyword_results = await self.scraper.run_keyword_analysis(keywords)
            
            logger.info(f"每月爬取任务完成，获取 {len(monthly_repos)} 个仓库，分析 {len(keyword_results)} 个关键词")
            
        except Exception as e:
            logger.error(f"每月爬取任务异常: {e}")
    
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
