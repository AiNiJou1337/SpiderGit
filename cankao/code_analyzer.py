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
            logger.warning(f"不支持的文件类型: {file_ext}")
            return None
            
        language = SUPPORTED_EXTENSIONS[file_ext]
        
        if not content:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                try:
                    with open(file_path, 'r', encoding='latin-1') as f:
                        content = f.read()
                except Exception as e:
                    logger.error(f"读取文件失败: {e}")
                    return None
            except Exception as e:
                logger.error(f"读取文件失败: {e}")
                return None
        
        result = {
            'importedLibraries': [],
            'api_endpoints': []
        }
        
        # 提取导入的库
        if language == 'python':
            result['importedLibraries'] = self._extract_python_imports(content)
        elif language in ['javascript', 'typescript']:
            result['importedLibraries'] = self._extract_js_imports(content)
        elif language == 'java':
            result['importedLibraries'] = self._extract_java_imports(content)
        elif language == 'php':
            result['importedLibraries'] = self._extract_php_imports(content)
        elif language == 'ruby':
            result['importedLibraries'] = self._extract_ruby_imports(content)
        elif language == 'go':
            result['importedLibraries'] = self._extract_go_imports(content)
            
        # 提取API端点（简化实现）
        if language in ['python', 'javascript', 'typescript']:
            result['api_endpoints'] = self._extract_api_endpoints(content)
            
        return result
    
    def _extract_python_imports(self, content):
        """提取Python代码中的导入库"""
        imports = set()
        
        # 匹配import语句
        import_pattern = r'^import\s+([a-zA-Z0-9_.,\s]+)(?:\s+as\s+[a-zA-Z0-9_]+)?$'
        from_pattern = r'^from\s+([a-zA-Z0-9_.]+)\s+import\s+[a-zA-Z0-9_*,\s]+'
        
        for line in content.split('\n'):
            line = line.strip()
            
            # 处理import语句
            match = re.match(import_pattern, line)
            if match:
                imported = match.group(1).strip()
                for imp in imported.split(','):
                    base_module = imp.strip().split('.')[0]
                    imports.add(base_module)
                continue
                
            # 处理from...import语句
            match = re.match(from_pattern, line)
            if match:
                base_module = match.group(1).strip().split('.')[0]
                imports.add(base_module)
                
        return list(imports)
    
    def _extract_js_imports(self, content):
        """提取JavaScript/TypeScript代码中的导入库"""
        imports = set()
        
        # ES6 import语句
        import_patterns = [
            r'import\s+(?:{[^}]+}|\*\s+as\s+[a-zA-Z0-9_]+|[a-zA-Z0-9_]+)\s+from\s+[\'"]([a-zA-Z0-9_\-@/.]+)[\'"]',
            r'import\s+[\'"]([a-zA-Z0-9_\-@/.]+)[\'"]',
            r'require\s*\(\s*[\'"]([a-zA-Z0-9_\-@/.]+)[\'"]\s*\)'
        ]
        
        for pattern in import_patterns:
            for match in re.finditer(pattern, content):
                package_path = match.group(1)
                
                # 处理相对路径
                if package_path.startswith('.'):
                    continue
                    
                # 提取包名（对于@scope/package形式处理）
                if package_path.startswith('@'):
                    parts = package_path.split('/')
                    if len(parts) >= 2:
                        package_name = f"{parts[0]}/{parts[1]}"
                        imports.add(package_name)
                else:
                    # 普通包
                    package_name = package_path.split('/')[0]
                    imports.add(package_name)
                
        return list(imports)
    
    def _extract_java_imports(self, content):
        """提取Java代码中的导入库"""
        imports = set()
        
        # 匹配import语句
        import_pattern = r'^import\s+([a-zA-Z0-9_.]+)(?:\.[*])?;'
        
        for line in content.split('\n'):
            line = line.strip()
            match = re.match(import_pattern, line)
            if match:
                import_path = match.group(1)
                # 获取包的顶级名称
                top_level = import_path.split('.')[0]
                imports.add(top_level)
                
        return list(imports)
    
    def _extract_php_imports(self, content):
        """提取PHP代码中的导入库"""
        imports = set()
        
        # 匹配require/include语句和use语句
        patterns = [
            r'(?:require|require_once|include|include_once)\s*\(\s*[\'"]([^\'")]+)[\'"]',
            r'use\s+([a-zA-Z0-9_\\]+)(?:\s+as\s+[a-zA-Z0-9_]+)?;'
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                imported = match.group(1)
                # 简化处理：提取顶级命名空间
                top_level = imported.strip('\\').split('\\')[0]
                if top_level:
                    imports.add(top_level)
                
        return list(imports)
    
    def _extract_ruby_imports(self, content):
        """提取Ruby代码中的导入库"""
        imports = set()
        
        # 匹配require语句
        patterns = [
            r'require\s+[\'"]([a-zA-Z0-9_/.-]+)[\'"]',
            r'require_relative\s+[\'"]([a-zA-Z0-9_/.-]+)[\'"]',
            r'gem\s+[\'"]([a-zA-Z0-9_-]+)[\'"]'
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                imported = match.group(1)
                # 提取基本名称（不带路径）
                base_name = os.path.basename(imported).split('.')[0]
                if base_name:
                    imports.add(base_name)
                
        return list(imports)
    
    def _extract_go_imports(self, content):
        """提取Go代码中的导入库"""
        imports = set()
        
        # 匹配单行和多行import语句
        single_import = r'import\s+(?:[a-zA-Z0-9_]+\s+)?[\'"]([a-zA-Z0-9_/.]+)[\'"]'
        
        # 处理多行导入块
        import_block_pattern = r'import\s+\(([^)]+)\)'
        for block_match in re.finditer(import_block_pattern, content):
            import_block = block_match.group(1)
            for line in import_block.split('\n'):
                line = line.strip()
                if line:
                    # 匹配 "package" 或 alias "package" 格式
                    match = re.match(r'(?:[a-zA-Z0-9_]+\s+)?[\'"]([a-zA-Z0-9_/.]+)[\'"]', line)
                    if match:
                        package_path = match.group(1)
                        # 提取顶级包
                        parts = package_path.split('/')
                        if len(parts) > 1:
                            top_level = parts[0]
                            imports.add(top_level)
        
        # 处理单行导入
        for match in re.finditer(single_import, content):
            package_path = match.group(1)
            parts = package_path.split('/')
            if len(parts) > 1:
                top_level = parts[0]
                imports.add(top_level)
                
        return list(imports)
    
    def _extract_api_endpoints(self, content):
        """尝试提取API端点（简化实现）"""
        endpoints = []
        
        # 尝试匹配常见的API路由定义
        patterns = [
            r'@app\.(?:route|get|post|put|delete)\s*\(\s*[\'"]([^\'"]+)[\'"]',  # Flask
            r'router\.(?:get|post|put|delete)\s*\(\s*[\'"]([^\'"]+)[\'"]',  # Express
            r'app\.(?:get|post|put|delete)\s*\(\s*[\'"]([^\'"]+)[\'"]',  # Express
            r'path\s*=\s*[\'"]([^\'"]+)[\'"]',  # 通用API路径定义
            r'url\s*=\s*[\'"]([^\'"]+)[\'"]'  # 通用URL定义
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                endpoint = match.group(1)
                if endpoint and not endpoint.startswith(('http://', 'https://')):
                    endpoints.append(endpoint)
                
        return endpoints

# 用于测试的主函数
def main():
    if len(sys.argv) < 2:
        print("用法: python code_analyzer.py <文件路径>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    analyzer = CodeAnalyzer()
    result = analyzer.analyze_file(file_path)
    
    if result:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("分析失败")

if __name__ == "__main__":
    main() 