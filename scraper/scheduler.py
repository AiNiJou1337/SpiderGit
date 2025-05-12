import schedule
import time
import logging
from main import main as scrape_trending

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def job():
    """定时执行的爬虫任务"""
    logging.info("开始执行定时爬虫任务...")
    try:
        scrape_trending()
        logging.info("定时爬虫任务执行完成")
    except Exception as e:
        logging.error(f"定时爬虫任务执行失败: {e}")

def start_scheduler():
    """启动定时任务调度器"""
    # 每天凌晨2点执行爬虫任务
    schedule.every().day.at("02:00").do(job)
    
    # 每周一凌晨3点执行爬虫任务（获取周榜数据）
    schedule.every().monday.at("03:00").do(job)
    
    # 每月1日凌晨4点执行爬虫任务（获取月榜数据）
    schedule.every().month_start.at("04:00").do(job)
    
    logging.info("定时任务调度器已启动")
    
    # 立即执行一次，获取初始数据
    job()
    
    # 持续运行，等待调度任务
    while True:
        schedule.run_pending()
        time.sleep(60)  # 每分钟检查一次是否有待执行的任务

if __name__ == "__main__":
    start_scheduler()