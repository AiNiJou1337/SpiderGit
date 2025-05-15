#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试分析脚本。用于手动分析特定关键词的项目数据。
使用方法：python test_analysis.py "关键词"
"""

import sys
import os
import logging
import datetime
import psycopg2
from data_analysis import (
    get_db_connection, 
    get_repositories_for_keyword,
    generate_and_save_analysis,
    ANALYTICS_DIR
)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('test_analysis')

def main():
    # 获取命令行参数
    if len(sys.argv) < 2:
        logger.error("请提供要分析的关键词，例如：python test_analysis.py \"机器学习\"")
        sys.exit(1)
    
    keyword = sys.argv[1]
    logger.info(f"开始分析关键词: {keyword}")
    
    # 确保分析结果目录存在
    os.makedirs(ANALYTICS_DIR, exist_ok=True)
    
    # 连接数据库
    conn = None
    try:
        # 连接数据库
        conn = get_db_connection()
        
        # 获取该关键词的仓库数据
        data = get_repositories_for_keyword(conn, keyword)
        
        if not data or not data['repositories']:
            logger.warning(f"没有找到关键词 '{keyword}' 的仓库数据，请确保已爬取该关键词的项目")
            sys.exit(1)
        
        logger.info(f"找到 {len(data['repositories'])} 个与关键词 '{keyword}' 相关的仓库")
        
        # 生成分析结果
        logger.info("开始生成分析结果...")
        result = generate_and_save_analysis(data, ANALYTICS_DIR, keyword)
        
        if result:
            logger.info(f"分析完成！结果已保存至 {ANALYTICS_DIR}")
            # 打印结果文件的完整路径
            safe_keyword = keyword.replace(' ', '_').replace('/', '_').replace('\\', '_')
            result_file = os.path.join(ANALYTICS_DIR, f'analysis_{safe_keyword}.json')
            logger.info(f"结果文件路径: {os.path.abspath(result_file)}")
        else:
            logger.error("分析失败，未生成结果")
    
    except Exception as e:
        logger.error(f"分析过程出错: {e}")
        import traceback
        logger.error(traceback.format_exc())
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main() 