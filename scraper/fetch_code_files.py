#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import time
import json
import argparse
import psycopg2
from pathlib import Path
import logging
import requests
import traceback
from code_analyzer import CodeAnalyzer

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('fetch_code_files')

# 数据库连接信息
DB_URL = os.environ.get('DATABASE_URL')
if not DB_URL:
    # 从.env文件读取
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    DB_URL = line.split('=', 1)[1].strip()
                    break

if not DB_URL:
    # 使用默认连接字符串
    DB_URL = "postgresql://postgres:postgres@localhost:5432/github_trending"
    logger.warning(f"未找到数据库连接字符串，使用默认值: {DB_URL}")

# 常量
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
}

# GitHub API Token
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
if GITHUB_TOKEN:
    HEADERS['Authorization'] = f'token {GITHUB_TOKEN}'

# 数据库连接
def get_db_connection():
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        raise

# 获取GitHub API请求
def github_api_request(url, params=None, raw_content=False):
    headers = HEADERS.copy()
    
    # 根据是否需要原始内容设置Accept头
    if raw_content:
        headers['Accept'] = 'application/vnd.github.v3.raw'
    else:
        headers['Accept'] = 'application/json'
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        # 如果请求原始内容，直接返回文本
        if raw_content:
            return response.text
        # 否则返回JSON
        return response.json()
    except Exception as e:
        logger.error(f"GitHub API请求失败: {e}")
        return None

# 判断是否为代码文件
def is_code_file(filename):
    code_extensions = ['.py', '.java', '.js', '.ts', '.jsx', '.tsx', '.php', '.rb', '.go', '.c', '.cpp', '.h', '.hpp', '.cs']
    ext = os.path.splitext(filename)[1].lower()
    return ext in code_extensions

# 保存代码文件分析结果
def save_code_file(conn, repo_id, filename, file_path, content, analysis_result):
    try:
        with conn.cursor() as cursor:
            # 首先检查是否已存在
            cursor.execute(
                'SELECT id FROM "code_files" WHERE repository_id = %s AND path = %s',
                (repo_id, file_path)
            )
            
            existing_file = cursor.fetchone()
            
            # 提取分析结果中的数据
            imported_libraries = analysis_result.get('imported_libraries', []) if analysis_result else []
            api_endpoints = analysis_result.get('api_endpoints', []) if analysis_result else []
            packages = analysis_result.get('packages', []) if analysis_result else []
            components = analysis_result.get('components', []) if analysis_result else []
            
            # 截取评论 (简单处理)
            comments = ''
            if content:
                comment_lines = []
                for line in content.split('\n'):
                    line = line.strip()
                    if line.startswith('#') or line.startswith('//') or line.startswith('/*') or line.startswith('*'):
                        comment_lines.append(line)
                if comment_lines:
                    comments = '\n'.join(comment_lines)
            
            if existing_file:
                # 更新现有文件
                cursor.execute(
                    '''
                    UPDATE "code_files" SET
                    "content" = %s,
                    "comments" = %s,
                    "updated_at" = NOW(),
                    "api_endpoints" = %s,
                    "importedLibraries" = %s,
                    "packages" = %s,
                    "components" = %s
                    WHERE id = %s
                    ''',
                    (
                        content, comments, api_endpoints, imported_libraries, 
                        packages, components, existing_file[0]
                    )
                )
                logger.info(f"更新代码文件: {file_path}")
            else:
                # 插入新文件
                cursor.execute(
                    '''
                    INSERT INTO "code_files" (
                        repository_id, filename, path, content, comments, 
                        created_at, updated_at, api_endpoints, "importedLibraries", 
                        packages, components
                    ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW(), %s, %s, %s, %s)
                    ''',
                    (
                        repo_id, filename, file_path, content, comments,
                        api_endpoints, imported_libraries, packages, components
                    )
                )
                logger.info(f"添加代码文件: {file_path}")
                
            conn.commit()
    except Exception as e:
        logger.error(f"保存代码文件失败: {e}")
        logger.error(traceback.format_exc())
        conn.rollback()

# 递归获取仓库的代码文件
def fetch_repository_files(repo_full_name, path='', max_files=30, current_count=0, max_depth=3, depth=0):
    """递归获取仓库中的代码文件"""
    if current_count >= max_files or depth > max_depth:
        return []
        
    contents_url = f"https://api.github.com/repos/{repo_full_name}/contents/{path}"
    contents = github_api_request(contents_url)
    
    # 如果获取失败，可能是因为默认分支不是"main"或"master"
    # 尝试获取仓库信息以确定默认分支
    if not contents or not isinstance(contents, list):
        try:
            # 获取仓库信息
            repo_url = f"https://api.github.com/repos/{repo_full_name}"
            repo_info = github_api_request(repo_url)
            
            if repo_info and 'default_branch' in repo_info:
                default_branch = repo_info['default_branch']
                logger.info(f"仓库 {repo_full_name} 的默认分支是: {default_branch}")
                
                # 使用默认分支尝试获取内容
                contents_url_with_branch = f"https://api.github.com/repos/{repo_full_name}/contents/{path}?ref={default_branch}"
                contents = github_api_request(contents_url_with_branch)
                
                if not contents or not isinstance(contents, list):
                    # 如果默认分支获取失败，尝试常见的其他分支
                    for branch in ['main', 'master', 'develop', 'dev']:
                        if branch == default_branch:
                            continue
                            
                        logger.info(f"尝试使用分支 {branch} 获取仓库 {repo_full_name} 的内容")
                        contents_url_with_branch = f"https://api.github.com/repos/{repo_full_name}/contents/{path}?ref={branch}"
                        contents = github_api_request(contents_url_with_branch)
                        
                        if contents and isinstance(contents, list):
                            logger.info(f"使用分支 {branch} 成功获取仓库 {repo_full_name} 的内容")
                            break
            
            if not contents or not isinstance(contents, list):
                logger.warning(f"无法获取仓库 {repo_full_name} 的内容，所有尝试都失败了")
                return []
                
        except Exception as e:
            logger.error(f"获取仓库默认分支时出错: {e}")
            return []
    
    code_files = []
    
    for item in contents:
        if current_count >= max_files:
            break
            
        if item['type'] == 'file' and is_code_file(item['name']):
            code_files.append(item)
            current_count += 1
        elif item['type'] == 'dir' and depth < max_depth:
            # 递归获取子目录中的文件
            sub_path = item['path']
            sub_files = fetch_repository_files(
                repo_full_name, sub_path, 
                max_files, current_count, 
                max_depth, depth + 1
            )
            code_files.extend(sub_files)
            current_count += len(sub_files)
            
    return code_files

# 获取关键词相关的仓库
def get_repositories_for_keyword(conn, keyword):
    try:
        with conn.cursor() as cursor:
            # 获取关键词ID
            cursor.execute('SELECT id FROM "keywords" WHERE "text" = %s', (keyword,))
            keyword_record = cursor.fetchone()
            
            if not keyword_record:
                logger.error(f"未找到关键词: {keyword}")
                return None
                
            keyword_id = keyword_record[0]
            
            # 获取与该关键词相关的仓库
            cursor.execute('''
                SELECT r.id, r.full_name
                FROM "repositories" r
                JOIN "repository_keywords" rk ON r.id = rk."repositoryId"
                WHERE rk."keywordId" = %s
            ''', (keyword_id,))
            
            repositories = []
            for row in cursor.fetchall():
                repositories.append({
                    'id': row[0],
                    'full_name': row[1]
                })
            
            return repositories
    except Exception as e:
        logger.error(f"获取仓库数据失败: {e}")
        return None

# 抓取特定关键词的代码文件
def fetch_code_files_for_keyword(keyword, max_files_per_repo=30, max_repos=None):
    conn = get_db_connection()
    try:
        # 获取关键词相关的仓库
        repositories = get_repositories_for_keyword(conn, keyword)
        
        if not repositories:
            logger.error(f"找不到与关键词 '{keyword}' 相关的仓库")
            return
            
        logger.info(f"找到 {len(repositories)} 个与关键词 '{keyword}' 相关的仓库")
        
        # 限制仓库数量
        if max_repos and len(repositories) > max_repos:
            repositories = repositories[:max_repos]
            
        # 初始化代码分析器
        analyzer = CodeAnalyzer()
        
        # 处理每个仓库
        for i, repo in enumerate(repositories):
            try:
                repo_id = repo['id']
                repo_full_name = repo['full_name']
                
                logger.info(f"[{i+1}/{len(repositories)}] 处理仓库: {repo_full_name}")
                
                # 获取仓库的代码文件
                code_files = fetch_repository_files(repo_full_name, max_files=max_files_per_repo)
                
                if not code_files:
                    logger.warning(f"仓库 {repo_full_name} 没有找到代码文件")
                    continue
                    
                logger.info(f"找到 {len(code_files)} 个代码文件")
                
                # 分析每个代码文件
                for file_item in code_files:
                    try:
                        # 获取文件内容
                        file_content = github_api_request(file_item['download_url'], raw_content=True)
                        
                        if not file_content:
                            continue
                            
                        # 分析文件
                        file_path = file_item['path']
                        filename = file_item['name']
                        
                        # 使用代码分析器分析文件
                        analysis_result = analyzer.analyze_file(file_path, file_content)
                        
                        # 保存分析结果
                        save_code_file(conn, repo_id, filename, file_path, file_content, analysis_result)
                        
                        # 添加延迟以避免触发GitHub API速率限制
                        time.sleep(0.5)
                        
                    except Exception as e:
                        logger.error(f"处理文件 {file_item.get('path', '未知')} 时出错: {e}")
                        logger.error(traceback.format_exc())
                
                # 添加延迟以避免触发GitHub API速率限制
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"处理仓库 {repo['full_name']} 时出错: {e}")
                logger.error(traceback.format_exc())
                
    except Exception as e:
        logger.error(f"抓取代码文件过程中出错: {e}")
        logger.error(traceback.format_exc())
    finally:
        conn.close()

# 主函数
def main():
    parser = argparse.ArgumentParser(description='获取特定关键词的仓库代码文件')
    parser.add_argument('--keywords', required=True, help='关键词，多个关键词用逗号分隔')
    parser.add_argument('--max-files', type=int, default=30, help='每个仓库最多处理的文件数')
    parser.add_argument('--max-repos', type=int, default=None, help='最多处理的仓库数')
    
    args = parser.parse_args()
    
    # 处理多个关键词
    keywords = [k.strip() for k in args.keywords.split(',')]
    
    for keyword in keywords:
        logger.info(f"开始处理关键词: {keyword}")
        fetch_code_files_for_keyword(keyword, args.max_files, args.max_repos)
        logger.info(f"完成处理关键词: {keyword}")

if __name__ == "__main__":
    main() 