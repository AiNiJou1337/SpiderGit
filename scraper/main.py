import requests
import json
import os
import datetime
from bs4 import BeautifulSoup
import psycopg2
from dotenv import load_dotenv
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# 加载环境变量
load_dotenv()

# 数据库连接信息
DATABASE_URL = os.getenv("DATABASE_URL")

def connect_to_db():
    """连接到PostgreSQL数据库"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logging.error(f"数据库连接失败: {e}")
        return None

def scrape_github_trending(period="daily", language=None):
    """抓取GitHub Trending页面数据
    
    Args:
        period: 时间段，可选值为 'daily', 'weekly', 'monthly'
        language: 编程语言筛选，默认为None表示所有语言
    
    Returns:
        包含仓库信息的列表
    """
    # 构建URL，添加语言筛选参数
    url = f"https://github.com/trending?since={period}"
    if language:
        url += f"&spoken_language_code={language}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        repositories = []
        
        # 查找所有仓库项
        repo_items = soup.select('article.Box-row')
        
        for item in repo_items:
            try:
                # 仓库名称和所有者
                repo_link = item.select_one('h2.h3 a')
                if not repo_link:
                    continue
                    
                full_name = repo_link.get_text(strip=True)
                owner, name = full_name.split('/', 1) if '/' in full_name else (full_name, '')
                
                # 仓库URL
                url = f"https://github.com{repo_link['href']}"
                
                # 仓库描述
                description_elem = item.select_one('p')
                description = description_elem.get_text(strip=True) if description_elem else None
                
                # 编程语言
                language_elem = item.select_one('span[itemprop="programmingLanguage"]')
                language = language_elem.get_text(strip=True) if language_elem else None
                
                # 星标数
                stars_elem = item.select('a.Link--muted')[0]
                stars = int(stars_elem.get_text(strip=True).replace(',', '')) if stars_elem else 0
                
                # 分叉数
                forks_elem = item.select('a.Link--muted')[1]
                forks = int(forks_elem.get_text(strip=True).replace(',', '')) if forks_elem else 0
                
                # 今日新增星标
                today_stars_elem = item.select_one('span.d-inline-block.float-sm-right')
                today_stars_text = today_stars_elem.get_text(strip=True) if today_stars_elem else '0'
                today_stars = int(''.join(filter(str.isdigit, today_stars_text))) if today_stars_text else 0
                
                repositories.append({
                    'owner': owner,
                    'name': name,
                    'fullName': f"{owner}/{name}",
                    'description': description,
                    'language': language,
                    'stars': stars,
                    'forks': forks,
                    'todayStars': today_stars,
                    'url': url,
                    'trendPeriod': period
                })
                
            except Exception as e:
                logging.error(f"解析仓库项时出错: {e}")
                continue
        
        return repositories
    
    except Exception as e:
        logging.error(f"抓取GitHub Trending页面失败: {e}")
        return []

def save_to_database(repositories, period="daily"):
    """将仓库数据保存到数据库
    
    Args:
        repositories: 包含仓库信息的列表
        period: 时间段，可选值为 'daily', 'weekly', 'monthly'
    """
    conn = connect_to_db()
    if not conn:
        return
    
    cursor = conn.cursor()
    now = datetime.datetime.now()
    
    try:
        # 将当前时间段的所有仓库标记为非趋势
        cursor.execute(
            "UPDATE repositories SET trending = FALSE WHERE trend_period = %s",
            (period,)
        )
        
        # 插入或更新仓库数据
        for repo in repositories:
            cursor.execute(
                """
                INSERT INTO repositories 
                (name, owner, full_name, description, language, stars, forks, today_stars, url, trend_date, trend_period, trending, updated_at) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s)
                ON CONFLICT (full_name) DO UPDATE SET 
                description = EXCLUDED.description,
                language = EXCLUDED.language,
                stars = EXCLUDED.stars,
                forks = EXCLUDED.forks,
                today_stars = EXCLUDED.today_stars,
                trending = TRUE,
                trend_date = EXCLUDED.trend_date,
                trend_period = EXCLUDED.trend_period,
                updated_at = EXCLUDED.updated_at
                """,
                (
                    repo['name'],
                    repo['owner'],
                    repo['fullName'],
                    repo['description'],
                    repo['language'],
                    repo['stars'],
                    repo['forks'],
                    repo['todayStars'],
                    repo['url'],
                    now,
                    period,
                    now
                )
            )
        
        conn.commit()
        logging.info(f"成功保存 {len(repositories)} 个仓库数据到数据库")
    
    except Exception as e:
        conn.rollback()
        logging.error(f"保存数据到数据库时出错: {e}")
    
    finally:
        cursor.close()
        conn.close()

def scrape_languages():
    """抓取GitHub支持的编程语言列表"""
    url = "https://github.com/trending"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        language_options = soup.select('select#language-options option')
        
        languages = []
        for option in language_options:
            if option.get('value'):
                languages.append({
                    'code': option.get('value'),
                    'name': option.get_text(strip=True)
                })
        
        return languages
    except Exception as e:
        logging.error(f"抓取语言列表失败: {e}")
        return []

def main():
    """主函数，抓取不同时间段的GitHub Trending数据并保存到数据库"""
    periods = ["daily", "weekly", "monthly"]
    
    # 抓取所有支持的语言
    logging.info("开始抓取GitHub支持的编程语言列表...")
    languages = scrape_languages()
    logging.info(f"抓取到 {len(languages)} 种编程语言")
    
    # 对每个时间段抓取数据
    for period in periods:
        logging.info(f"开始抓取 {period} GitHub Trending 数据...")
        
        # 抓取所有语言的趋势仓库
        repositories = scrape_github_trending(period)
        
        if repositories:
            logging.info(f"抓取到 {len(repositories)} 个 {period} trending 仓库")
            save_to_database(repositories, period)
        else:
            logging.warning(f"未抓取到 {period} trending 仓库数据")
        
        # 可以选择性地为特定语言抓取数据
        # 注意：这会增加抓取时间和数据库大小
        # 以下代码已注释，如需启用请取消注释
        """
        for language in languages[:10]:  # 只抓取前10种流行语言
            lang_code = language['code']
            logging.info(f"抓取 {period} {language['name']} 语言的趋势仓库...")
            lang_repos = scrape_github_trending(period, lang_code)
            
            if lang_repos:
                logging.info(f"抓取到 {len(lang_repos)} 个 {language['name']} 语言的 {period} trending 仓库")
                save_to_database(lang_repos, period)
        """

if __name__ == "__main__":
    main()