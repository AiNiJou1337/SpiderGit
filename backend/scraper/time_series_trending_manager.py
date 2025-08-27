#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
时间序列趋势数据管理器
支持历史数据保存和时间序列分析
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import os
import sys

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.scraper.crawlers.github_trending_html import GitHubTrendingHTMLCrawler
from backend.scraper.core.api_client import GitHubAPIClient

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('trending_time_series.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TimeSeriesTrendingManager:
    """时间序列趋势数据管理器"""
    
    def __init__(self):
        self.api_client = GitHubAPIClient()
        # 使用 GitHub Trending HTML 爬虫
        self.crawler = GitHubTrendingHTMLCrawler()
        
        # 数据存储目录
        self.base_dir = Path('public/trends')
        self.time_series_dir = self.base_dir / 'time_series'
        self.daily_dir = self.time_series_dir / 'daily'
        self.weekly_dir = self.time_series_dir / 'weekly'
        self.monthly_dir = self.time_series_dir / 'monthly'
        
        # 创建目录结构
        for dir_path in [self.base_dir, self.time_series_dir, self.daily_dir, self.weekly_dir, self.monthly_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    async def collect_and_store_trends(self, periods: List[str] = None) -> bool:
        """收集并存储趋势数据"""
        if periods is None:
            periods = ['daily', 'weekly', 'monthly']
        
        logger.info("[START] 开始收集时间序列趋势数据...")

        try:
            # 检查API连接
            if not self.api_client.test_connection():
                logger.error("GitHub API 连接失败")
                return False

            current_time = datetime.now()
            success_count = 0

            for period in periods:
                try:
                    logger.info(f"[INFO] 收集 {period} 趋势数据...")

                    # 获取趋势数据
                    data = await self._fetch_period_data(period)

                    if data:
                        # 保存时间序列数据
                        await self._save_time_series_data(data, period, current_time)

                        # 更新主趋势文件
                        await self._update_main_trends_file(data, period, current_time)

                        success_count += 1
                        logger.info(f"[SUCCESS] {period} 数据收集完成: {len(data)} 个项目")
                    else:
                        logger.warning(f"[WARNING] {period} 数据收集失败")

                except Exception as e:
                    logger.error(f"[ERROR] {period} 数据收集异常: {e}")
                    continue
            
            # 生成汇总报告
            await self._generate_summary_report(current_time)
            
            logger.info(f"🎉 趋势数据收集完成: {success_count}/{len(periods)} 个时间段成功")
            return success_count > 0
            
        except Exception as e:
            logger.error(f"趋势数据收集失败: {e}")
            return False
    
    async def _fetch_period_data(self, period: str) -> List[Dict[str, Any]]:
        """获取指定时间段的趋势数据"""
        try:
            # 根据时间段设置不同的参数
            if period == 'daily':
                repos = self.crawler.fetch('daily')
            elif period == 'weekly':
                repos = self.crawler.fetch('weekly')
            else:  # monthly
                repos = self.crawler.fetch('monthly')
            
            # HTML爬虫已经返回了正确格式的数据，无需再次格式化
            return repos
            
        except Exception as e:
            logger.error(f"获取 {period} 数据失败: {e}")
            return []
    
    def _format_repository_data(self, repo: Dict[str, Any], period: str) -> Dict[str, Any]:
        """格式化仓库数据"""
        try:
            return {
                'id': repo.get('id'),
                'name': repo.get('name'),
                'owner': repo.get('owner', {}).get('login') if isinstance(repo.get('owner'), dict) else repo.get('owner'),
                'fullName': repo.get('full_name'),
                'description': repo.get('description', ''),
                'language': repo.get('language'),
                'stars': repo.get('stargazers_count', repo.get('stars', 0)),
                'forks': repo.get('forks_count', repo.get('forks', 0)),
                'todayStars': repo.get('today_stars', 0),
                'url': repo.get('html_url', repo.get('url')),
                'createdAt': repo.get('created_at'),
                'updatedAt': repo.get('updated_at'),
                'pushedAt': repo.get('pushed_at'),
                'topics': repo.get('topics', []),
                'trendPeriod': period,
                'trendDate': datetime.now().isoformat(),
                'collectedAt': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"格式化仓库数据失败: {e}")
            return None
    
    async def _save_time_series_data(self, data: List[Dict[str, Any]], period: str, timestamp: datetime):
        """保存时间序列数据"""
        try:
            # 生成文件名：YYYY-MM-DD_HH-MM-SS.json
            filename = f"{timestamp.strftime('%Y-%m-%d_%H-%M-%S')}.json"
            
            # 选择目录
            if period == 'daily':
                file_path = self.daily_dir / filename
            elif period == 'weekly':
                file_path = self.weekly_dir / filename
            else:  # monthly
                file_path = self.monthly_dir / filename
            
            # 构建数据结构
            time_series_data = {
                'timestamp': timestamp.isoformat(),
                'period': period,
                'count': len(data),
                'repositories': data,
                'metadata': {
                    'collectionTime': timestamp.isoformat(),
                    'apiVersion': '2024-01-24',
                    'dataVersion': '1.0'
                }
            }
            
            # 保存文件
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(time_series_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"[SAVE] 时间序列数据已保存: {file_path}")
            
        except Exception as e:
            logger.error(f"保存时间序列数据失败: {e}")
    
    async def _update_main_trends_file(self, data: List[Dict[str, Any]], period: str, timestamp: datetime):
        """更新主趋势文件（保持向后兼容）"""
        try:
            trends_file = self.base_dir / 'trends.json'
            
            # 读取现有数据
            existing_data = {}
            if trends_file.exists():
                try:
                    with open(trends_file, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                except Exception as e:
                    logger.warning(f"读取现有trends.json失败: {e}")
            
            # 更新对应时间段的数据
            existing_data[period] = data
            existing_data['lastUpdated'] = timestamp.isoformat()
            existing_data['metadata'] = existing_data.get('metadata', {})
            existing_data['metadata'].update({
                f'{period}Count': len(data),
                f'{period}LastUpdate': timestamp.isoformat()
            })
            
            # 计算总数
            total_count = 0
            for p in ['daily', 'weekly', 'monthly']:
                if p in existing_data and isinstance(existing_data[p], list):
                    total_count += len(existing_data[p])
            existing_data['metadata']['totalCount'] = total_count
            
            # 保存更新后的数据
            with open(trends_file, 'w', encoding='utf-8') as f:
                json.dump(existing_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"[UPDATE] 主趋势文件已更新: {trends_file}")
            
        except Exception as e:
            logger.error(f"更新主趋势文件失败: {e}")
    
    async def _generate_summary_report(self, timestamp: datetime):
        """生成汇总报告"""
        try:
            report_file = self.time_series_dir / 'collection_report.json'
            
            # 统计各时间段的数据文件数量
            daily_files = len(list(self.daily_dir.glob('*.json')))
            weekly_files = len(list(self.weekly_dir.glob('*.json')))
            monthly_files = len(list(self.monthly_dir.glob('*.json')))
            
            report = {
                'lastCollection': timestamp.isoformat(),
                'statistics': {
                    'dailySnapshots': daily_files,
                    'weeklySnapshots': weekly_files,
                    'monthlySnapshots': monthly_files,
                    'totalSnapshots': daily_files + weekly_files + monthly_files
                },
                'dataRetention': {
                    'dailyRetentionDays': 30,
                    'weeklyRetentionWeeks': 12,
                    'monthlyRetentionMonths': 12
                },
                'nextCollection': (timestamp + timedelta(hours=2)).isoformat()
            }
            
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            
            logger.info(f"[REPORT] 汇总报告已生成: {report_file}")
            
        except Exception as e:
            logger.error(f"生成汇总报告失败: {e}")

async def main():
    """主函数"""
    manager = TimeSeriesTrendingManager()
    
    # 收集趋势数据
    success = await manager.collect_and_store_trends()
    
    if success:
        logger.info("[SUCCESS] 时间序列趋势数据收集完成")
    else:
        logger.error("[ERROR] 时间序列趋势数据收集失败")
    
    return success

if __name__ == "__main__":
    asyncio.run(main())
