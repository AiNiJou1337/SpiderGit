#!/usr/bin/env python3
"""
重新分析关键词脚本
用于更新现有关键词的分析结果，修复星标和标签分析问题
"""

import sys
import os
import subprocess
from pathlib import Path

def reanalyze_keyword(keyword):
    """重新分析指定关键词"""
    print(f"🔄 重新分析关键词: {keyword}")
    
    try:
        # 调用数据分析器
        cmd = [
            sys.executable,
            "backend/scraper/analyzers/data_analysis.py",
            "--keywords", keyword
        ]
        
        print(f"   执行命令: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
        
        if result.returncode == 0:
            print(f"   ✅ {keyword} 分析完成")
            print(f"   输出: {result.stdout.strip()}")
            return True
        else:
            print(f"   ❌ {keyword} 分析失败")
            print(f"   错误: {result.stderr.strip()}")
            return False
            
    except Exception as e:
        print(f"   ❌ 执行失败: {e}")
        return False

def main():
    """主函数"""
    print("🚀 开始重新分析关键词\n")
    
    # 需要重新分析的关键词列表（新爬虫的关键词）
    keywords_to_reanalyze = [
        "React",
        "Estate API",
        # 可以添加其他需要重新分析的关键词
    ]
    
    success_count = 0
    total_count = len(keywords_to_reanalyze)
    
    for keyword in keywords_to_reanalyze:
        if reanalyze_keyword(keyword):
            success_count += 1
        print()  # 空行分隔
    
    print("="*50)
    print(f"📊 重新分析完成: {success_count}/{total_count} 成功")
    
    if success_count == total_count:
        print("🎉 所有关键词重新分析成功！")
        print("\n📝 修复说明:")
        print("1. ✅ 修复了星标字段名不匹配问题")
        print("2. ✅ 修复了爬虫缺少 topics 字段的问题")
        print("3. ✅ 重新生成了分析结果")
        print("\n💡 建议:")
        print("- 刷新浏览器页面查看更新后的分析结果")
        print("- 新爬取的关键词将自动包含正确的星标和标签数据")
    else:
        print("⚠️ 部分关键词重新分析失败，请检查错误信息")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
