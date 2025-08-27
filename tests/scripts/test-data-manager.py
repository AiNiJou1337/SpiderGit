#!/usr/bin/env python3
"""
测试数据存储与读取管理器
用于管理测试结果的存储、读取和分析
"""

import os
import json
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

class TestDataManager:
    """测试数据管理器"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.tests_dir = self.project_root / 'tests'
        self.results_dir = self.tests_dir / 'results'
        self.db_path = self.results_dir / 'test_results.db'
        
        # 确保目录存在
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
        # 初始化数据库
        self.init_database()
    
    def init_database(self):
        """初始化SQLite数据库"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 创建测试结果表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS test_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    test_type TEXT NOT NULL,
                    test_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    duration REAL,
                    coverage REAL,
                    error_message TEXT,
                    output TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            ''')
            
            # 创建测试套件表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS test_suites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    suite_name TEXT NOT NULL,
                    total_tests INTEGER,
                    passed_tests INTEGER,
                    failed_tests INTEGER,
                    coverage REAL,
                    duration REAL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    config TEXT
                )
            ''')
            
            # 创建连接测试表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS connection_tests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token_loading BOOLEAN,
                    api_connection BOOLEAN,
                    simple_search BOOLEAN,
                    rate_limit_remaining INTEGER,
                    rate_limit_total INTEGER,
                    error_message TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 创建爬虫测试表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS crawler_tests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    keyword TEXT,
                    language TEXT,
                    max_results INTEGER,
                    total_repositories INTEGER,
                    successful_parsing INTEGER,
                    failed_parsing INTEGER,
                    data_quality REAL,
                    execution_time REAL,
                    output_files TEXT,
                    errors TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            print(f"✅ 测试数据库初始化完成: {self.db_path}")
            
        except Exception as e:
            print(f"❌ 数据库初始化失败: {e}")
    
    def save_test_result(self, test_type: str, test_name: str, result: Dict[str, Any]):
        """保存单个测试结果"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO test_results 
                (test_type, test_name, status, duration, coverage, error_message, output, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                test_type,
                test_name,
                result.get('status', 'unknown'),
                result.get('duration', 0),
                result.get('coverage', 0),
                result.get('error'),
                result.get('output'),
                json.dumps(result.get('metadata', {}))
            ))
            
            conn.commit()
            conn.close()
            print(f"✅ 测试结果已保存: {test_type}/{test_name}")
            
        except Exception as e:
            print(f"❌ 保存测试结果失败: {e}")
    
    def save_test_suite(self, suite_name: str, suite_data: Dict[str, Any]):
        """保存测试套件结果"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO test_suites 
                (suite_name, total_tests, passed_tests, failed_tests, coverage, duration, config)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                suite_name,
                suite_data.get('total_tests', 0),
                suite_data.get('passed_tests', 0),
                suite_data.get('failed_tests', 0),
                suite_data.get('coverage', 0),
                suite_data.get('duration', 0),
                json.dumps(suite_data.get('config', {}))
            ))
            
            conn.commit()
            conn.close()
            print(f"✅ 测试套件结果已保存: {suite_name}")
            
        except Exception as e:
            print(f"❌ 保存测试套件结果失败: {e}")
    
    def save_connection_test(self, result: Dict[str, Any]):
        """保存连接测试结果"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            rate_limit = result.get('rateLimit', {})
            
            cursor.execute('''
                INSERT INTO connection_tests 
                (token_loading, api_connection, simple_search, rate_limit_remaining, 
                 rate_limit_total, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                result.get('tokenLoading', False),
                result.get('apiConnection', False),
                result.get('simpleSearch', False),
                rate_limit.get('remaining', 0) if rate_limit else 0,
                rate_limit.get('limit', 0) if rate_limit else 0,
                result.get('error')
            ))
            
            conn.commit()
            conn.close()
            print("✅ 连接测试结果已保存")
            
        except Exception as e:
            print(f"❌ 保存连接测试结果失败: {e}")
    
    def save_crawler_test(self, config: Dict[str, Any], result: Dict[str, Any]):
        """保存爬虫测试结果"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO crawler_tests 
                (keyword, language, max_results, total_repositories, successful_parsing,
                 failed_parsing, data_quality, execution_time, output_files, errors)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                config.get('keyword'),
                config.get('language'),
                config.get('maxResults', 0),
                result.get('totalRepositories', 0),
                result.get('successfulParsing', 0),
                result.get('failedParsing', 0),
                result.get('dataQuality', 0),
                result.get('executionTime', 0),
                json.dumps(result.get('outputFiles', [])),
                json.dumps(result.get('errors', []))
            ))
            
            conn.commit()
            conn.close()
            print("✅ 爬虫测试结果已保存")
            
        except Exception as e:
            print(f"❌ 保存爬虫测试结果失败: {e}")
    
    def get_latest_results(self, test_type: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """获取最新的测试结果"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if test_type:
                cursor.execute('''
                    SELECT * FROM test_results 
                    WHERE test_type = ? 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                ''', (test_type, limit))
            else:
                cursor.execute('''
                    SELECT * FROM test_results 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                ''', (limit,))
            
            columns = [description[0] for description in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                result = dict(zip(columns, row))
                if result['metadata']:
                    result['metadata'] = json.loads(result['metadata'])
                results.append(result)
            
            conn.close()
            return results
            
        except Exception as e:
            print(f"❌ 获取测试结果失败: {e}")
            return []
    
    def get_test_statistics(self, days: int = 7) -> Dict[str, Any]:
        """获取测试统计信息"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 计算日期范围
            start_date = datetime.now() - timedelta(days=days)
            
            # 获取基本统计
            cursor.execute('''
                SELECT 
                    test_type,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    AVG(duration) as avg_duration,
                    AVG(coverage) as avg_coverage
                FROM test_results 
                WHERE timestamp >= ?
                GROUP BY test_type
            ''', (start_date.isoformat(),))
            
            stats = {}
            for row in cursor.fetchall():
                test_type, total, passed, failed, avg_duration, avg_coverage = row
                stats[test_type] = {
                    'total': total,
                    'passed': passed,
                    'failed': failed,
                    'success_rate': (passed / total * 100) if total > 0 else 0,
                    'avg_duration': avg_duration or 0,
                    'avg_coverage': avg_coverage or 0
                }
            
            conn.close()
            return stats
            
        except Exception as e:
            print(f"❌ 获取测试统计失败: {e}")
            return {}
    
    def cleanup_old_results(self, days: int = 30):
        """清理旧的测试结果"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # 清理各个表的旧数据
            tables = ['test_results', 'test_suites', 'connection_tests', 'crawler_tests']
            
            for table in tables:
                cursor.execute(f'''
                    DELETE FROM {table} 
                    WHERE timestamp < ?
                ''', (cutoff_date.isoformat(),))
                
                deleted = cursor.rowcount
                if deleted > 0:
                    print(f"✅ 清理了 {table} 表中 {deleted} 条旧记录")
            
            conn.commit()
            conn.close()
            print(f"✅ 清理完成，删除了 {days} 天前的数据")
            
        except Exception as e:
            print(f"❌ 清理旧数据失败: {e}")
    
    def export_results(self, output_file: str, format: str = 'json'):
        """导出测试结果"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            if format == 'json':
                # 导出为JSON格式
                data = {}
                
                # 导出各个表的数据
                tables = ['test_results', 'test_suites', 'connection_tests', 'crawler_tests']
                
                for table in tables:
                    cursor = conn.cursor()
                    cursor.execute(f'SELECT * FROM {table} ORDER BY timestamp DESC LIMIT 100')
                    
                    columns = [description[0] for description in cursor.description]
                    rows = cursor.fetchall()
                    
                    data[table] = []
                    for row in rows:
                        record = dict(zip(columns, row))
                        data[table].append(record)
                
                # 保存到文件
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2, default=str)
                
                print(f"✅ 测试结果已导出到: {output_file}")
            
            conn.close()
            
        except Exception as e:
            print(f"❌ 导出测试结果失败: {e}")

def main():
    """主函数"""
    print("📊 测试数据管理器")
    print("=" * 50)
    
    manager = TestDataManager()
    
    # 显示统计信息
    stats = manager.get_test_statistics(7)
    if stats:
        print("\n📈 最近7天测试统计:")
        for test_type, data in stats.items():
            print(f"  {test_type}:")
            print(f"    总计: {data['total']}")
            print(f"    通过: {data['passed']}")
            print(f"    失败: {data['failed']}")
            print(f"    成功率: {data['success_rate']:.1f}%")
    
    # 显示最新结果
    latest = manager.get_latest_results(limit=5)
    if latest:
        print(f"\n📋 最新 {len(latest)} 条测试结果:")
        for result in latest:
            print(f"  {result['timestamp']}: {result['test_type']}/{result['test_name']} - {result['status']}")
    
    print(f"\n💾 数据库位置: {manager.db_path}")

if __name__ == "__main__":
    main()
