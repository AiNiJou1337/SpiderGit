#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GitHub Trending HTML 爬虫
解析 https://github.com/trending 上的每日/每周/每月趋势
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import time
import random

logger = logging.getLogger(__name__)

BASE_URL = "https://github.com/trending"

class GitHubTrendingHTMLCrawler:
    """通过解析 GitHub Trending HTML 页面获取趋势仓库"""

    def __init__(self, session: Optional[requests.Session] = None):
        self.session = session or requests.Session()
        # 禁用环境代理（若本地有不可用的代理变量会影响访问）
        self.session.trust_env = False
        self.session.proxies = {}

        # 设置连接池和重试参数
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=10,
            pool_maxsize=20,
            max_retries=3
        )
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)

        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }

    def fetch(self, period: str = "daily", language: Optional[str] = None, max_retries: int = 3) -> List[Dict[str, Any]]:
        """抓取 GitHub Trending 页面
        period: daily | weekly | monthly
        language: 语言路径段（如 'python'），None 表示全部语言
        max_retries: 最大重试次数
        """
        params = {"since": period}
        url = BASE_URL
        if language and language.lower() != "all":
            url = f"{BASE_URL}/{language}"

        for attempt in range(max_retries + 1):
            try:
                logger.info(f"正在请求 {url} (尝试 {attempt + 1}/{max_retries + 1})")

                # 添加随机延迟避免被限制
                if attempt > 0:
                    delay = random.uniform(2, 5) * attempt
                    logger.info(f"等待 {delay:.1f} 秒后重试...")
                    time.sleep(delay)

                resp = self.session.get(
                    url,
                    params=params,
                    headers=self.headers,
                    timeout=(10, 30),  # (连接超时, 读取超时)
                    allow_redirects=True
                )

                if resp.status_code == 200:
                    logger.info(f"成功获取 {period} 趋势页面")
                    return self._parse_html(resp.text)
                elif resp.status_code == 429:
                    logger.warning(f"请求被限制 (429)，等待后重试...")
                    if attempt < max_retries:
                        time.sleep(60)  # 等待1分钟
                        continue
                else:
                    logger.error("请求 Trending 失败: %s - %s", resp.status_code, resp.text[:200])

            except requests.exceptions.ConnectTimeout:
                logger.warning(f"连接超时 (尝试 {attempt + 1}/{max_retries + 1})")
            except requests.exceptions.ReadTimeout:
                logger.warning(f"读取超时 (尝试 {attempt + 1}/{max_retries + 1})")
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"连接错误 (尝试 {attempt + 1}/{max_retries + 1}): {e}")
            except requests.RequestException as e:
                logger.error(f"请求异常 (尝试 {attempt + 1}/{max_retries + 1}): {e}")

            if attempt == max_retries:
                logger.error(f"所有重试都失败了，无法获取 {period} 趋势数据")
                break

        return []

    def _parse_html(self, html: str) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "lxml")
        items = []
        for article in soup.select("article.Box-row"):
            try:
                # 仓库名 owner/name
                title_a = article.select_one("h2 a")
                if not title_a:
                    continue
                full_name = title_a.get_text(strip=True).replace("\n", "").replace(" ", "")
                # full_name 形如 owner/repo
                owner, name = full_name.split("/") if "/" in full_name else (full_name, full_name)

                # 描述
                desc_el = article.select_one("p")
                description = desc_el.get_text(strip=True) if desc_el else ""

                # 主要语言
                lang_el = article.select_one("span[itemprop='programmingLanguage']")
                language = lang_el.get_text(strip=True) if lang_el else None

                # Star 和 Fork 数（页面上的 total 值）
                # 尝试多种选择器来获取stars和forks数据
                stars_el = (article.select_one("a[href*='/stargazers']") or
                           article.select_one("a[href$='/stargazers']") or
                           article.select_one("a[aria-label*='star']"))
                forks_el = (article.select_one("a[href*='/network/members']") or
                           article.select_one("a[href*='/forks']") or
                           article.select_one("a[href$='/forks']") or
                           article.select_one("a[aria-label*='fork']"))

                stars = _parse_number(stars_el.get_text(strip=True)) if stars_el else 0
                forks = _parse_number(forks_el.get_text(strip=True)) if forks_el else 0

                # 如果仍然获取不到，尝试从页面的其他位置获取
                if stars == 0:
                    # 尝试从其他可能的位置获取stars
                    star_spans = article.select("span")
                    for span in star_spans:
                        text = span.get_text(strip=True)
                        if "star" in text.lower() and any(c.isdigit() for c in text):
                            stars = _parse_number(text.split()[0])
                            break

                if forks == 0:
                    # 尝试从其他可能的位置获取forks
                    fork_spans = article.select("span")
                    for span in fork_spans:
                        text = span.get_text(strip=True)
                        if "fork" in text.lower() and any(c.isdigit() for c in text):
                            forks = _parse_number(text.split()[0])
                            break

                # 今日/本周期新增 star（页面右下角的 "xxx stars today"）
                today_el = article.select_one("span.d-inline-block.float-sm-right")
                today_text = today_el.get_text(strip=True) if today_el else ""
                today_stars = _parse_number(today_text.split(" ")[0]) if today_text else 0

                item = {
                    "id": hash(f"{owner}/{name}") % 1000000,  # 生成数字ID
                    "name": name,
                    "full_name": f"{owner}/{name}",
                    "description": description or "",
                    "html_url": f"https://github.com/{owner}/{name}",
                    "stargazers_count": stars,
                    "language": language or "",
                    "forks_count": forks,
                    "open_issues_count": 0,  # HTML页面无此信息，设为0
                    "created_at": datetime.now().isoformat(),  # 使用当前时间
                    "updated_at": datetime.now().isoformat(),  # 使用当前时间
                    "topics": [],  # HTML页面无此信息，设为空数组
                    "license": None,  # HTML页面无此信息
                    "owner": {
                        "login": owner,
                        "avatar_url": f"https://github.com/{owner}.png"  # GitHub头像URL格式
                    },
                    # 额外字段，用于兼容
                    "today_stars": today_stars,
                    "pushed_at": None,
                    "scraped_at": datetime.now().isoformat(),
                }
                items.append(item)
            except Exception as e:
                logger.warning("解析单项失败: %s", e)
                continue
        return items


def _parse_number(text: str) -> int:
    """将 '1,234' 或 '1.2k' 等文本解析为整数"""
    try:
        t = text.lower().replace(",", "").strip()
        if t.endswith("k"):
            return int(float(t[:-1]) * 1000)
        if t.endswith("m"):
            return int(float(t[:-1]) * 1_000_000)
        return int(float(t))
    except Exception:
        return 0

