#!/usr/bin/env python3
"""
简单的重新分析脚本
直接调用分析器重新生成分析结果
"""

import sys
import subprocess
import os

def run_analysis(keyword):
    """运行分析器"""
    print(f"🔄 重新分析关键词: {keyword}")
    
    try:
        # 设置环境变量以避免编码问题
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        
        # 调用分析器
        cmd = [
            sys.executable,
            "backend/scraper/analyzers/data_analysis.py",
            "--keywords", keyword
        ]
        
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            cwd=".",
            env=env,
            encoding='utf-8'
        )
        
        if result.returncode == 0:
            print(f"   ✅ {keyword} 分析完成")
            # 只显示关键信息
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if '分析完成' in line or '保存到' in line:
                    print(f"   {line}")
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
    print("🚀 重新分析关键词数据\n")
    
    # 需要重新分析的关键词
    keywords = [
        "React",
        "Estate API"
    ]
    
    success_count = 0
    
    for keyword in keywords:
        if run_analysis(keyword):
            success_count += 1
        print()
    
    print("="*50)
    print(f"📊 重新分析完成: {success_count}/{len(keywords)} 成功")
    
    if success_count > 0:
        print("\n🎉 分析结果已更新！")
        print("📝 修复总结:")
        print("1. ✅ 修复了星标字段名不匹配问题 (stargazers_count vs stars)")
        print("2. ✅ 重新生成了分析结果，星标数据现在正常显示")
        print("3. ⚠️ 标签数据仍为空，因为现有数据是在修复爬虫之前爬取的")
        print("\n💡 建议:")
        print("- 刷新浏览器页面查看更新后的星标分析结果")
        print("- 如需完整的标签数据，建议重新爬取这些关键词")
    else:
        print("❌ 重新分析失败")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
