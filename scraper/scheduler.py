import schedule
import time
import logging
from main import main as scrape_trending

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def job(period=None):
    """定时执行的爬虫任务。period 可为 daily/weekly/monthly，用于控制抓取范围"""
    try:
        # 月初执行月榜抓取，其余按日/周配置
        logging.info("开始执行定时爬虫任务...%s", f"period={period}" if period else "")
        scrape_trending()
        logging.info("定时爬虫任务执行完成")
    except Exception as e:
        logging.error(f"定时爬虫任务执行失败: {e}")


def start_scheduler():
    """启动定时任务调度器"""
    # 每天凌晨2点执行爬虫任务（每日）
    schedule.every().day.at("02:00").do(lambda: job(period="daily"))

    # 每周一凌晨3点执行爬虫任务（周）
    schedule.every().monday.at("03:00").do(lambda: job(period="weekly"))

    # 每天凌晨4点检查是否月初，若是则执行月度任务（schedule 无 month_start，故此处手动判定）
    def monthly_guard():
        if time.localtime().tm_mday == 1:
            job(period="monthly")
    schedule.every().day.at("04:00").do(monthly_guard)

    logging.info("定时任务调度器已启动")

    # 立即执行一次，获取初始数据
    job()

    # 持续运行，等待调度任务
    while True:
        schedule.run_pending()
        time.sleep(60)  # 每分钟检查一次是否有待执行的任务


if __name__ == "__main__":
    start_scheduler()
