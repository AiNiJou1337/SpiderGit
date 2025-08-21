#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试修复后的爬虫功能
"""

import os
import sys
import psycopg2
from pathlib import Path

# 添加项目根目录到路径
sys.path.append(str(Path(__file__).parent))

from scraper.keyword_scraper import get_db_connection, save_code_analysis_to_db

def test_database_connection():
    """测试数据库连接"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 测试查询
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        print(f"数据库连接成功: {version[0]}")
        
        # 检查表结构
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'code_files' 
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        print("\ncode_files 表结构:")
        for col_name, col_type in columns:
            print(f"  {col_name}: {col_type}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return False

def test_save_code_analysis():
    """测试保存代码分析结果"""
    try:
        conn = get_db_connection()
        
        # 模拟分析数据
        test_data = {
            'repository_id': 1,  # 假设存在ID为1的仓库
            'analysis_results': [
                {
                    'file_path': 'test/example.py',
                    'language': 'Python',
                    'imports': ['requests', 'json', 'os']
                },
                {
                    'file_path': 'src/main.js',
                    'language': 'JavaScript',
                    'imports': ['react', 'axios', 'lodash']
                }
            ]
        }
        
        print("测试保存代码分析结果...")
        save_code_analysis_to_db(conn, test_data)
        print("保存测试完成")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"保存测试失败: {e}")
        return False

def main():
    print("开始测试修复后的功能...")
    
    # 测试数据库连接
    if not test_database_connection():
        print("数据库连接测试失败，退出")
        return
    
    # 测试保存功能
    if not test_save_code_analysis():
        print("保存功能测试失败")
        return
    
    print("所有测试通过！")

if __name__ == "__main__":
    main()
