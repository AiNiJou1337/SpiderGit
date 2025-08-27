#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
趋势数据定时更新调度器
专门用于定期更新GitHub趋势数据
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

from backend.scraper.trending_manager import TrendingDataManager

# 配置日志
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('trending_scheduler.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

class TrendingScheduler:
    """趋势数据定时调度器"""
    
    def __init__(self):
        self.manager = TrendingDataManager()
        
    async def update_trending_data(self):
        """更新趋势数据"""
        try:
            logger.info("🚀 开始定时更新趋势数据...")
            
            # 检查API状态
            rate_limit = self.manager.get_rate_limit_status()
            if rate_limit:
                remaining = rate_limit.get('remaining', 0)
                limit = rate_limit.get('limit', 0)
                logger.info(f"📊 API状态: {remaining}/{limit} 剩余")
                
                if remaining < 200:
                    logger.warning("⚠️  API调用次数不足，跳过本次更新")
                    return False
            
            # 执行数据更新
            success = await self.manager.fetch_and_save_all_trends()
            
            if success:
                logger.info("✅ 趋势数据更新完成")
            else:
                logger.error("❌ 趋势数据更新失败")
                
            return success
            
        except Exception as e:
            logger.error(f"趋势数据更新异常: {e}")
            return False
    
    def job_wrapper(self, job_func):
        """异步任务包装器"""
        def wrapper():
            try:
                result = asyncio.run(job_func())
                if result:
                    logger.info("✅ 定时任务执行成功")
                else:
                    logger.error("❌ 定时任务执行失败")
            except Exception as e:
                logger.error(f"定时任务执行异常: {e}")
        return wrapper
    
    def start_scheduler(self):
        """启动定时任务调度器"""
        logger.info("🚀 启动GitHub趋势数据调度器...")
        
        # 检查环境变量
        tokens = [
            os.getenv('GITHUB_TOKEN_PQG'),
            os.getenv('GITHUB_TOKEN_LR'), 
            os.getenv('GITHUB_TOKEN_HXZ'),
            os.getenv('GITHUB_TOKEN_XHY'),
            os.getenv('GITHUB_TOKEN')
        ]
        
        if not any(tokens):
            logger.error("❌ 未找到GitHub Token环境变量")
            logger.info("请设置以下任一环境变量: GITHUB_TOKEN_PQG, GITHUB_TOKEN_LR, GITHUB_TOKEN_HXZ, GITHUB_TOKEN_XHY, GITHUB_TOKEN")
            return
        
        logger.info("✅ GitHub Token配置检查通过")
        
        # 安排定时任务
        # 每2小时更新一次趋势数据
        schedule.every(2).hours.do(self.job_wrapper(self.update_trending_data))
        logger.info("📅 已安排定时任务: 每2小时更新趋势数据")
        
        # 每天凌晨2点执行一次完整更新
        schedule.every().day.at("02:00").do(self.job_wrapper(self.update_trending_data))
        logger.info("📅 已安排每日任务: 每天 02:00 完整更新")
        
        # API状态检查任务
        def check_api_status():
            try:
                status = self.manager.get_rate_limit_status()
                if status:
                    remaining = status.get('remaining', 0)
                    limit = status.get('limit', 0)
                    reset_time = status.get('reset', 0)
                    reset_datetime = datetime.fromtimestamp(reset_time) if reset_time else None
                    
                    logger.info(f"📊 API状态检查: {remaining}/{limit} 剩余")
                    if reset_datetime:
                        logger.info(f"🔄 重置时间: {reset_datetime.strftime('%Y-%m-%d %H:%M:%S')}")
                    
                    if remaining < 100:
                        logger.warning(f"⚠️  API调用次数较少: {remaining}")
                else:
                    logger.warning("❌ API状态检查失败")
            except Exception as e:
                logger.error(f"API状态检查异常: {e}")
        
        # 每30分钟检查一次API状态
        schedule.every(30).minutes.do(check_api_status)
        logger.info("📅 已安排API状态检查: 每30分钟")
        
        logger.info("✅ 定时任务调度器启动完成")
        
        # 立即执行一次数据更新
        logger.info("🔄 执行初始数据更新...")
        try:
            initial_success = asyncio.run(self.update_trending_data())
            if initial_success:
                logger.info("✅ 初始数据更新完成")
            else:
                logger.warning("⚠️  初始数据更新失败，但调度器将继续运行")
        except Exception as e:
            logger.error(f"初始数据更新异常: {e}")
        
        # 持续运行调度器
        logger.info("🔄 开始监听定时任务...")
        while True:
            try:
                schedule.run_pending()
                time.sleep(60)  # 每分钟检查一次
            except KeyboardInterrupt:
                logger.info("⏹️  收到中断信号，正在停止调度器...")
                break
            except Exception as e:
                logger.error(f"调度器运行异常: {e}")
                time.sleep(60)
        
        logger.info("⏹️  趋势数据调度器已停止")

def main():
    """主函数"""
    print("🚀 GitHub趋势数据调度器")
    print("=" * 50)
    
    scheduler = TrendingScheduler()
    
    try:
        scheduler.start_scheduler()
    except KeyboardInterrupt:
        print("\n⏹️  用户中断程序")
    except Exception as e:
        print(f"\n💥 程序异常: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
