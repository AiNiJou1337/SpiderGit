#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
GitHub 趋势爬虫主程序（重构后版本）
整合了所有爬虫功能的主入口
"""

import os
import sys
import asyncio
import logging
from datetime import datetime
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.scraper.core.api_client import GitHubAPIClient
from backend.scraper.core.token_manager import GitHubTokenManager
from backend.scraper.crawlers.github_trending_html import GitHubTrendingHTMLCrawler
from backend.scraper.analyzers.code_analyzer import CodeAnalyzer

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('scraper.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

class GitHubTrendingScraper:
    """GitHub 趋势爬虫主类"""
    
    def __init__(self):
        self.api_client = GitHubAPIClient()
        self.token_manager = GitHubTokenManager()
        self.trending_crawler = GitHubTrendingHTMLCrawler()
        self.code_analyzer = CodeAnalyzer()
        
    async def run_daily_scraping(self):
        """运行每日爬取任务"""
        logger.info("开始每日 GitHub 趋势爬取...")
        
        try:
            # 检查 API 连接
            if not self.api_client.test_connection():
                logger.error("GitHub API 连接失败")
                return False
            
            # 获取趋势仓库
            trending_repos = self.trending_crawler.fetch(
                period='daily',
                language=None
            )
            
            if not trending_repos:
                logger.warning("未获取到趋势仓库数据")
                return False
            
            logger.info(f"获取到 {len(trending_repos)} 个趋势仓库")
            
            # 分析仓库代码
            analyzed_count = 0
            for repo in trending_repos[:100]:  # 限制分析前100个仓库
                try:
                    analysis = await self.analyze_repository(repo)
                    if analysis:
                        analyzed_count += 1
                        logger.info(f"分析完成: {repo['full_name']}")
                except Exception as e:
                    logger.error(f"分析仓库 {repo['full_name']} 失败: {e}")
            
            logger.info(f"完成每日爬取，分析了 {analyzed_count} 个仓库")
            return True
            
        except Exception as e:
            logger.error(f"每日爬取失败: {e}")
            return False
    
    async def analyze_repository(self, repo_data):
        """分析单个仓库"""
        try:
            # 获取仓库详细信息
            repo_details = self.api_client.get_repository(
                repo_data['owner'],
                repo_data['name']
            )
            
            if not repo_details:
                return None
            
            # 获取仓库内容
            contents = self.api_client.get_repository_contents(
                repo_data['owner'],
                repo_data['name']
            )
            
            # 分析代码结构
            analysis_result = {
                'repository': repo_details,
                'languages': self.api_client.get_repository_languages(
                    repo_data['owner'],
                    repo_data['name']
                ),
                'topics': self.api_client.get_repository_topics(
                    repo_data['owner'],
                    repo_data['name']
                ),
                'readme': self.api_client.get_repository_readme(
                    repo_data['owner'],
                    repo_data['name']
                ),
                'analyzed_at': datetime.now().isoformat()
            }
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"分析仓库失败: {e}")
            return None
    
    async def run_keyword_analysis(self, keywords):
        """运行关键词分析"""
        logger.info(f"开始关键词分析: {keywords}")
        
        results = {}
        for keyword in keywords:
            try:
                # 搜索相关仓库
                search_result = self.api_client.search_repositories(
                    query=keyword,
                    sort='stars',
                    order='desc',
                    per_page=50
                )
                
                if search_result and 'items' in search_result:
                    results[keyword] = {
                        'total_count': search_result.get('total_count', 0),
                        'repositories': search_result['items'][:10],  # 只保留前10个
                        'analyzed_at': datetime.now().isoformat()
                    }
                    logger.info(f"关键词 '{keyword}' 找到 {len(search_result['items'])} 个仓库")
                
            except Exception as e:
                logger.error(f"分析关键词 '{keyword}' 失败: {e}")
        
        return results
    
    def get_rate_limit_status(self):
        """获取 API 速率限制状态"""
        status = self.api_client.get_rate_limit_status()
        if status:
            core_limit = status.get('resources', {}).get('core', {})
            logger.info(f"API 限制状态: {core_limit.get('remaining', 0)}/{core_limit.get('limit', 0)}")
            return core_limit
        return None

async def main():
    """主函数"""
    logger.info("GitHub 趋势爬虫启动")
    
    scraper = GitHubTrendingScraper()
    
    # 检查 API 状态
    rate_limit = scraper.get_rate_limit_status()
    if not rate_limit or rate_limit.get('remaining', 0) < 100:
        logger.warning("API 调用次数不足，请稍后再试")
        return
    
    # 运行每日爬取
    success = await scraper.run_daily_scraping()
    
    if success:
        logger.info("爬取任务完成")
    else:
        logger.error("爬取任务失败")
    
    # 运行关键词分析
    keywords = ['react', 'vue', 'python', 'javascript', 'machine-learning']
    keyword_results = await scraper.run_keyword_analysis(keywords)
    
    logger.info(f"关键词分析完成，分析了 {len(keyword_results)} 个关键词")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("用户中断程序")
    except Exception as e:
        logger.error(f"程序异常退出: {e}")
        sys.exit(1)
