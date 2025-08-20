#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import re
import json
import logging
from pathlib import Path

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('code_analyzer')

# 支持的文件类型
SUPPORTED_EXTENSIONS = {
    '.py': 'python',
    '.java': 'java',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp'
}

class CodeAnalyzer:
    def __init__(self):
        pass

    def analyze_file(self, file_path, content=None):
        """分析单个文件，提取导入的库"""
        if not os.path.exists(file_path) and not content:
            logger.error(f"文件不存在: {file_path}")
            return None

        file_ext = os.path.splitext(file_path)[1].lower()

        if file_ext not in SUPPORTED_EXTENSIONS:
            return None

        language = SUPPORTED_EXTENSIONS[file_ext]

        # 如果没有提供内容，读取文件
        if content is None:
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception as e:
                logger.error(f"读取文件失败 {file_path}: {e}")
                return None

        # 提取导入的库
        imports = self._extract_imports(content, language)

        return {
            'file_path': file_path,
            'language': language,
            'imports': imports,
            'file_size': len(content),
            'line_count': len(content.split('\n'))
        }

    def _extract_imports(self, content, language):
        """根据语言提取导入语句"""
        imports = []
        lines = content.split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Python
            if language == 'python':
                # import xxx
                match = re.match(r'^import\s+([a-zA-Z_][a-zA-Z0-9_]*)', line)
                if match:
                    imports.append(match.group(1))
                    continue

                # from xxx import yyy
                match = re.match(r'^from\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+import', line)
                if match:
                    imports.append(match.group(1))
                    continue

            # JavaScript/TypeScript
            elif language in ['javascript', 'typescript']:
                # import xxx from 'yyy'
                match = re.match(r'^import\s+.*?\s+from\s+[\'"]([^\'\"]+)[\'"]', line)
                if match:
                    lib_name = match.group(1)
                    # 只取第一部分（去掉路径）
                    lib_name = lib_name.split('/')[0]
                    if not lib_name.startswith('.'):  # 排除相对路径
                        imports.append(lib_name)
                    continue

                # const xxx = require('yyy')
                match = re.match(r'^(?:const|var|let)\s+.*?\s*=\s*require\s*\(\s*[\'"]([^\'\"]+)[\'"]\s*\)', line)
                if match:
                    lib_name = match.group(1)
                    lib_name = lib_name.split('/')[0]
                    if not lib_name.startswith('.'):
                        imports.append(lib_name)
                    continue

            # Java
            elif language == 'java':
                # import xxx.yyy.zzz;
                match = re.match(r'^import\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)', line)
                if match:
                    full_import = match.group(1)
                    # 取第一部分作为库名
                    lib_name = full_import.split('.')[0]
                    imports.append(lib_name)
                    continue

            # Go
            elif language == 'go':
                # import "xxx"
                match = re.match(r'^import\s+[\'"]([^\'\"]+)[\'"]', line)
                if match:
                    lib_name = match.group(1)
                    # 取最后一部分作为库名
                    lib_name = lib_name.split('/')[-1]
                    imports.append(lib_name)
                    continue

            # C/C++
            elif language in ['c', 'cpp']:
                # #include <xxx.h> 或 #include "xxx.h"
                match = re.match(r'^#include\s*[<"]([^>"]+)[>"]', line)
                if match:
                    header = match.group(1)
                    # 去掉扩展名
                    lib_name = os.path.splitext(header)[0]
                    imports.append(lib_name)
                    continue

            # PHP
            elif language == 'php':
                # require 'xxx' 或 include 'xxx'
                match = re.match(r'^(?:require|include)(?:_once)?\s*\(\s*[\'"]([^\'\"]+)[\'"]\s*\)', line)
                if match:
                    lib_name = match.group(1)
                    lib_name = os.path.splitext(os.path.basename(lib_name))[0]
                    imports.append(lib_name)
                    continue

                # use xxx\yyy\zzz;
                match = re.match(r'^use\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\\[a-zA-Z_][a-zA-Z0-9_]*)*)', line)
                if match:
                    full_import = match.group(1)
                    lib_name = full_import.split('\\')[0]
                    imports.append(lib_name)
                    continue

            # Ruby
            elif language == 'ruby':
                # require 'xxx'
                match = re.match(r'^require\s+[\'"]([^\'\"]+)[\'"]', line)
                if match:
                    lib_name = match.group(1)
                    lib_name = os.path.splitext(os.path.basename(lib_name))[0]
                    imports.append(lib_name)
                    continue

            # C#
            elif language == 'csharp':
                # using xxx.yyy.zzz;
                match = re.match(r'^using\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)', line)
                if match:
                    full_import = match.group(1)
                    lib_name = full_import.split('.')[0]
                    imports.append(lib_name)
                    continue

        # 去重并返回
        return list(set(imports))

    def analyze_directory(self, directory_path, max_files=100):
        """分析目录中的所有代码文件"""
        results = {
            'total_files': 0,
            'analyzed_files': 0,
            'languages': {},
            'libraries': {},
            'files': []
        }

        if not os.path.exists(directory_path):
            logger.error(f"目录不存在: {directory_path}")
            return results

        file_count = 0
        for root, dirs, files in os.walk(directory_path):
            # 跳过一些常见的无关目录
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', '__pycache__', 'vendor']]

            for file in files:
                if file_count >= max_files:
                    break

                file_path = os.path.join(root, file)
                file_ext = os.path.splitext(file)[1].lower()

                results['total_files'] += 1

                if file_ext in SUPPORTED_EXTENSIONS:
                    analysis = self.analyze_file(file_path)
                    if analysis:
                        results['analyzed_files'] += 1
                        results['files'].append(analysis)

                        # 统计语言
                        lang = analysis['language']
                        results['languages'][lang] = results['languages'].get(lang, 0) + 1

                        # 统计库
                        for lib in analysis['imports']:
                            if lib not in results['libraries']:
                                results['libraries'][lib] = {
                                    'count': 0,
                                    'languages': set(),
                                    'files': []
                                }
                            results['libraries'][lib]['count'] += 1
                            results['libraries'][lib]['languages'].add(lang)
                            results['libraries'][lib]['files'].append(file_path)

                        file_count += 1

                        if file_count >= max_files:
                            break

            if file_count >= max_files:
                break

        # 转换 set 为 list 以便 JSON 序列化
        for lib_info in results['libraries'].values():
            lib_info['languages'] = list(lib_info['languages'])

        return results

    def save_analysis(self, results, output_file):
        """保存分析结果到文件"""
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            logger.info(f"分析结果已保存到: {output_file}")
            return True
        except Exception as e:
            logger.error(f"保存分析结果失败: {e}")
            return False

def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='代码分析器')
    parser.add_argument('path', help='要分析的文件或目录路径')
    parser.add_argument('--output', '-o', default='analysis_result.json', help='输出文件路径')
    parser.add_argument('--max-files', type=int, default=100, help='最大分析文件数量')

    args = parser.parse_args()

    analyzer = CodeAnalyzer()

    if os.path.isfile(args.path):
        # 分析单个文件
        result = analyzer.analyze_file(args.path)
        if result:
            results = {
                'type': 'file',
                'path': args.path,
                'analysis': result
            }
        else:
            logger.error("文件分析失败")
            return
    elif os.path.isdir(args.path):
        # 分析目录
        results = analyzer.analyze_directory(args.path, args.max_files)
        results['type'] = 'directory'
        results['path'] = args.path
    else:
        logger.error(f"路径不存在: {args.path}")
        return

    # 保存结果
    analyzer.save_analysis(results, args.output)

if __name__ == "__main__":
    main()
