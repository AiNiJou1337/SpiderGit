#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
代码分析器（重构后版本）
用于分析仓库中的代码文件，提取导入的库和依赖
"""

import os
import sys
import re
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

# 设置日志
logger = logging.getLogger(__name__)

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
    '.cs': 'csharp',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala'
}

class CodeAnalyzer:
    """代码分析器类"""
    
    def __init__(self):
        self.import_patterns = self._init_import_patterns()
        
    def _init_import_patterns(self) -> Dict[str, List[re.Pattern]]:
        """初始化各种语言的导入模式"""
        return {
            'python': [
                re.compile(r'^import\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)', re.MULTILINE),
                re.compile(r'^from\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s+import', re.MULTILINE),
            ],
            'javascript': [
                re.compile(r'import\s+.*?\s+from\s+[\'"]([^\'\"]+)[\'"]', re.MULTILINE),
                re.compile(r'require\s*\(\s*[\'"]([^\'\"]+)[\'"]\s*\)', re.MULTILINE),
            ],
            'typescript': [
                re.compile(r'import\s+.*?\s+from\s+[\'"]([^\'\"]+)[\'"]', re.MULTILINE),
                re.compile(r'require\s*\(\s*[\'"]([^\'\"]+)[\'"]\s*\)', re.MULTILINE),
            ],
            'java': [
                re.compile(r'^import\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)', re.MULTILINE),
            ],
            'go': [
                re.compile(r'import\s+[\'"]([^\'\"]+)[\'"]', re.MULTILINE),
                re.compile(r'import\s+\(\s*[\'"]([^\'\"]+)[\'"]', re.MULTILINE),
            ],
        }
        
    def analyze_file(self, file_path: str, content: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """分析单个文件，提取导入的库"""
        if not os.path.exists(file_path) and not content:
            logger.error(f"文件不存在: {file_path}")
            return None
            
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext not in SUPPORTED_EXTENSIONS:
            return None
            
        language = SUPPORTED_EXTENSIONS[file_ext]
        
        try:
            if content is None:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
        except Exception as e:
            logger.error(f"读取文件失败 {file_path}: {e}")
            return None
            
        imports = self._extract_imports(content, language)
        
        return {
            'file_path': file_path,
            'language': language,
            'imports': imports,
            'file_size': len(content),
            'line_count': len(content.splitlines())
        }
    
    def _extract_imports(self, content: str, language: str) -> List[str]:
        """从代码内容中提取导入的库"""
        imports = []
        
        if language not in self.import_patterns:
            return imports
            
        for pattern in self.import_patterns[language]:
            matches = pattern.findall(content)
            for match in matches:
                # 清理导入名称
                import_name = self._clean_import_name(match, language)
                if import_name and import_name not in imports:
                    imports.append(import_name)
                    
        return sorted(imports)
    
    def _clean_import_name(self, import_name: str, language: str) -> Optional[str]:
        """清理导入名称，提取主要的库名"""
        if not import_name:
            return None
            
        # 移除相对路径导入
        if import_name.startswith('.'):
            return None
            
        # 根据语言特性清理
        if language == 'python':
            # 只保留顶级包名
            return import_name.split('.')[0]
        elif language in ['javascript', 'typescript']:
            # 移除相对路径和文件扩展名
            if import_name.startswith('./') or import_name.startswith('../'):
                return None
            # 移除文件扩展名
            import_name = re.sub(r'\.(js|ts|jsx|tsx)$', '', import_name)
            # 只保留包名（不包含路径）
            if '/' in import_name:
                parts = import_name.split('/')
                # 如果是 scoped package (@xxx/yyy)，保留前两部分
                if parts[0].startswith('@'):
                    return '/'.join(parts[:2]) if len(parts) > 1 else parts[0]
                else:
                    return parts[0]
            return import_name
        elif language == 'java':
            # 只保留包的前几级
            parts = import_name.split('.')
            if len(parts) > 2:
                return '.'.join(parts[:2])
            return import_name
        else:
            return import_name
    
    def analyze_repository(self, repo_path: str, max_files: int = 100) -> Dict[str, Any]:
        """分析整个仓库"""
        if not os.path.exists(repo_path):
            logger.error(f"仓库路径不存在: {repo_path}")
            return {}
            
        results = {
            'repository_path': repo_path,
            'languages': {},
            'imports': {},
            'file_count': 0,
            'total_lines': 0,
            'analyzed_files': []
        }
        
        file_count = 0
        
        for root, dirs, files in os.walk(repo_path):
            # 跳过常见的忽略目录
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in [
                'node_modules', '__pycache__', 'vendor', 'target', 'build', 'dist'
            ]]
            
            for file in files:
                if file_count >= max_files:
                    break
                    
                file_path = os.path.join(root, file)
                file_ext = os.path.splitext(file)[1].lower()
                
                if file_ext in SUPPORTED_EXTENSIONS:
                    analysis = self.analyze_file(file_path)
                    if analysis:
                        language = analysis['language']
                        
                        # 统计语言
                        if language not in results['languages']:
                            results['languages'][language] = 0
                        results['languages'][language] += 1
                        
                        # 统计导入
                        if language not in results['imports']:
                            results['imports'][language] = {}
                            
                        for import_name in analysis['imports']:
                            if import_name not in results['imports'][language]:
                                results['imports'][language][import_name] = 0
                            results['imports'][language][import_name] += 1
                        
                        results['total_lines'] += analysis['line_count']
                        results['analyzed_files'].append({
                            'path': file_path,
                            'language': language,
                            'imports': analysis['imports'],
                            'lines': analysis['line_count']
                        })
                        
                        file_count += 1
                        
            if file_count >= max_files:
                break
                
        results['file_count'] = file_count
        
        # 计算最常用的库
        results['top_imports'] = self._get_top_imports(results['imports'])
        
        return results
    
    def _get_top_imports(self, imports_by_language: Dict[str, Dict[str, int]], top_n: int = 10) -> Dict[str, List[Tuple[str, int]]]:
        """获取每种语言最常用的库"""
        top_imports = {}
        
        for language, imports in imports_by_language.items():
            sorted_imports = sorted(imports.items(), key=lambda x: x[1], reverse=True)
            top_imports[language] = sorted_imports[:top_n]
            
        return top_imports
