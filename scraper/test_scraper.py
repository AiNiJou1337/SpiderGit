import sys
import os
import datetime
import logging
import time
import requests
from dotenv import load_dotenv

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# 导入爬虫文件中的函数
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scraper.keyword_scraper import (
    get_db_connection, 
    github_api_request,
    search_github_repositories,
    format_repository_data,
    save_repository
)

# 设置HTTP头
def get_headers():
    """获取请求头"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    # 从环境变量获取GitHub Token
    github_token = os.environ.get("GITHUB_TOKEN", "")
    if github_token:
        headers["Authorization"] = f"token {github_token}"
    return headers

def test_database_connection():
    """测试数据库连接"""
    print("\n===== 测试数据库连接 =====")
    try:
        conn = get_db_connection()
        print("✅ 成功连接到数据库")
        # 测试查询
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM repositories")
        result = cursor.fetchone()
        print(f"当前数据库中有 {result[0]} 个仓库记录")
        
        cursor.execute("SELECT COUNT(*) FROM keywords")
        result = cursor.fetchone()
        print(f"当前数据库中有 {result[0]} 个关键词记录")
        
        cursor.execute("SELECT COUNT(*) FROM repository_keywords")
        result = cursor.fetchone()
        print(f"当前数据库中有 {result[0]} 个仓库-关键词关联记录")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False

def test_github_api():
    """测试GitHub API连接"""
    print("\n===== 测试GitHub API连接 =====")
    headers = get_headers()
    try:
        # 测试GitHub API连接
        response = requests.get("https://api.github.com/rate_limit", headers=headers)
        if response.status_code == 200:
            rate_limit = response.json()
            remaining = rate_limit['resources']['core']['remaining']
            reset_time = datetime.datetime.fromtimestamp(rate_limit['resources']['core']['reset'])
            print(f"✅ 成功连接到GitHub API")
            print(f"API请求剩余次数: {remaining}")
            print(f"API限制重置时间: {reset_time}")
            return True
        else:
            print(f"❌ GitHub API连接失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ GitHub API连接出错: {e}")
        return False

def test_repository_search():
    """测试仓库搜索功能"""
    print("\n===== 测试仓库搜索功能 =====")
    # 只搜索一个简单关键词的2个项目
    keyword = "test-project"
    language = "python"
    limit = 2
    
    try:
        repositories = search_github_repositories(keyword, language=language, max_results=limit)
        if repositories and len(repositories) > 0:
            print(f"✅ 成功搜索到 {len(repositories)} 个仓库")
            for i, repo in enumerate(repositories):
                repo_data = format_repository_data(repo)
                print(f"{i+1}. {repo_data['full_name']} - ⭐ {repo_data['stars']}")
            return repositories
        else:
            print("❌ 未搜索到任何仓库")
            return None
    except Exception as e:
        print(f"❌ 仓库搜索功能出错: {e}")
        return None

def test_save_to_db(repo, keyword):
    """测试保存到数据库功能"""
    print(f"\n===== 测试保存到数据库功能: {repo['full_name']} =====")
    try:
        conn = get_db_connection()
        
        # 获取或创建关键词ID
        with conn.cursor() as cursor:
            cursor.execute('SELECT id FROM "keywords" WHERE "text" = %s', (keyword,))
            keyword_record = cursor.fetchone()
            
            if not keyword_record:
                cursor.execute(
                    'INSERT INTO "keywords" ("text", "created_at") VALUES (%s, %s) RETURNING id',
                    (keyword, datetime.datetime.now())
                )
                keyword_id = cursor.fetchone()[0]
                conn.commit()
            else:
                keyword_id = keyword_record[0]
                
        # 保存仓库
        repo_id = save_repository(conn, repo, keyword_id)
        
        if repo_id:
            print(f"✅ 成功保存仓库到数据库，ID: {repo_id}")
            conn.close()
            return True
        else:
            print("❌ 保存仓库到数据库失败")
            conn.close()
            return False
    except Exception as e:
        print(f"❌ 保存到数据库功能出错: {e}")
        return False

def run_all_tests():
    """运行所有测试"""
    print("======= 开始爬虫功能测试 =======")
    print(f"当前时间: {datetime.datetime.now()}")
    
    # 加载环境变量
    load_dotenv()
    
    # 测试数据库连接
    if not test_database_connection():
        print("❌ 数据库连接测试失败，终止测试")
        return
    
    # 测试GitHub API连接
    if not test_github_api():
        print("❌ GitHub API连接测试失败，终止测试")
        return
    
    # 测试仓库搜索
    repositories = test_repository_search()
    if not repositories:
        print("❌ 仓库搜索测试失败，终止测试")
        return
    
    # 对第一个仓库进行测试
    repo = repositories[0]
    repo_data = format_repository_data(repo)
    
    # 测试保存到数据库
    test_save_to_db(repo_data, "test-project")
    
    print("\n======= 爬虫功能测试完成 =======")

if __name__ == "__main__":
    run_all_tests()