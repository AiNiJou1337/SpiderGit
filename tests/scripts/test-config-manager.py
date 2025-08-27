#!/usr/bin/env python3
"""
测试配置管理器
用于管理和验证项目的测试配置
"""

import os
import json
import yaml
from pathlib import Path
from typing import Dict, Any, List

class TestConfigManager:
    """测试配置管理器"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.tests_dir = self.project_root / 'tests'
        
    def get_frontend_config(self) -> Dict[str, Any]:
        """获取前端测试配置"""
        jest_config_path = self.tests_dir / 'frontend' / 'jest.config.js'
        
        config = {
            'framework': 'Jest + React Testing Library',
            'config_file': str(jest_config_path),
            'test_environment': 'jsdom',
            'coverage_threshold': {
                'branches': 70,
                'functions': 80,
                'lines': 80,
                'statements': 80
            },
            'test_patterns': [
                '**/__tests__/**/*.{js,jsx,ts,tsx}',
                '**/*.{test,spec}.{js,jsx,ts,tsx}'
            ],
            'setup_files': [
                'tests/frontend/jest.setup.js'
            ],
            'module_name_mapping': {
                '^@/(.*)$': '<rootDir>/src/$1',
                '^@/components/(.*)$': '<rootDir>/src/components/$1',
                '^@/lib/(.*)$': '<rootDir>/src/lib/$1'
            }
        }
        
        return config
    
    def get_backend_config(self) -> Dict[str, Any]:
        """获取后端测试配置"""
        pyproject_path = self.project_root / 'backend' / 'pyproject.toml'
        
        config = {
            'framework': 'pytest',
            'config_file': str(pyproject_path),
            'test_paths': ['tests/backend'],
            'python_files': ['test_*.py', '*_test.py'],
            'python_classes': ['Test*'],
            'python_functions': ['test_*'],
            'coverage_threshold': 60,
            'markers': [
                'slow: marks tests as slow',
                'integration: marks tests as integration tests',
                'unit: marks tests as unit tests',
                'api: marks tests that require API access'
            ],
            'addopts': [
                '-v',
                '--tb=short',
                '--strict-markers',
                '--disable-warnings',
                '--cov=backend',
                '--cov-report=term-missing',
                '--cov-report=html:htmlcov',
                '--cov-fail-under=60'
            ]
        }
        
        return config
    
    def get_integration_config(self) -> Dict[str, Any]:
        """获取集成测试配置"""
        config = {
            'framework': 'Custom Integration Tests',
            'test_types': [
                'API Integration',
                'Database Integration',
                'File System Integration',
                'External Service Integration'
            ],
            'test_environment': {
                'database': 'test_database',
                'api_endpoints': 'localhost:3000',
                'external_services': 'mock'
            }
        }
        
        return config
    
    def get_e2e_config(self) -> Dict[str, Any]:
        """获取E2E测试配置"""
        config = {
            'framework': 'Playwright (Future)',
            'browsers': ['chromium', 'firefox', 'webkit'],
            'test_environment': {
                'base_url': 'http://localhost:3000',
                'timeout': 30000,
                'viewport': {'width': 1280, 'height': 720}
            },
            'test_scenarios': [
                'User Login Flow',
                'Data Viewing Flow',
                'Search Functionality',
                'Export Functionality',
                'Navigation Flow'
            ]
        }
        
        return config
    
    def validate_configs(self) -> Dict[str, Any]:
        """验证所有测试配置"""
        validation_results = {
            'frontend': self._validate_frontend_config(),
            'backend': self._validate_backend_config(),
            'integration': self._validate_integration_config(),
            'e2e': self._validate_e2e_config()
        }
        
        return validation_results
    
    def _validate_frontend_config(self) -> Dict[str, Any]:
        """验证前端测试配置"""
        issues = []
        
        # 检查Jest配置文件
        jest_config = self.tests_dir / 'frontend' / 'jest.config.js'
        if not jest_config.exists():
            issues.append('Jest配置文件不存在')
        
        # 检查Jest setup文件
        jest_setup = self.tests_dir / 'frontend' / 'jest.setup.js'
        if not jest_setup.exists():
            issues.append('Jest setup文件不存在')
        
        # 检查测试目录
        tests_dir = self.tests_dir / 'frontend' / '__tests__'
        if not tests_dir.exists():
            issues.append('前端测试目录不存在')
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'recommendations': [
                '确保所有组件都有对应的测试文件',
                '保持测试覆盖率在80%以上',
                '使用React Testing Library的最佳实践'
            ]
        }
    
    def _validate_backend_config(self) -> Dict[str, Any]:
        """验证后端测试配置"""
        issues = []
        
        # 检查pyproject.toml
        pyproject = self.project_root / 'backend' / 'pyproject.toml'
        if not pyproject.exists():
            issues.append('pyproject.toml文件不存在')
        
        # 检查后端测试目录
        backend_tests = self.tests_dir / 'backend'
        if not backend_tests.exists():
            issues.append('后端测试目录不存在')
        
        # 检查是否有测试文件
        test_files = list(backend_tests.glob('test_*.py'))
        if len(test_files) == 0:
            issues.append('没有找到后端测试文件')
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'test_files_count': len(test_files),
            'recommendations': [
                '为每个主要模块编写单元测试',
                '添加集成测试覆盖API端点',
                '使用pytest fixtures提高测试效率'
            ]
        }
    
    def _validate_integration_config(self) -> Dict[str, Any]:
        """验证集成测试配置"""
        return {
            'valid': False,
            'issues': ['集成测试功能尚未实现'],
            'recommendations': [
                '创建API集成测试',
                '添加数据库集成测试',
                '实现外部服务mock测试'
            ]
        }
    
    def _validate_e2e_config(self) -> Dict[str, Any]:
        """验证E2E测试配置"""
        return {
            'valid': False,
            'issues': ['E2E测试功能尚未实现'],
            'recommendations': [
                '安装Playwright或Cypress',
                '创建关键用户流程测试',
                '设置CI/CD中的E2E测试环境'
            ]
        }
    
    def generate_config_report(self) -> str:
        """生成配置报告"""
        frontend_config = self.get_frontend_config()
        backend_config = self.get_backend_config()
        validation_results = self.validate_configs()
        
        report = []
        report.append("# 测试配置报告")
        report.append("=" * 50)
        report.append("")
        
        # 前端配置
        report.append("## 前端测试配置")
        report.append(f"- 框架: {frontend_config['framework']}")
        report.append(f"- 配置文件: {frontend_config['config_file']}")
        report.append(f"- 测试环境: {frontend_config['test_environment']}")
        report.append(f"- 覆盖率目标: {frontend_config['coverage_threshold']}")
        
        if validation_results['frontend']['issues']:
            report.append("- ⚠️ 问题:")
            for issue in validation_results['frontend']['issues']:
                report.append(f"  - {issue}")
        else:
            report.append("- ✅ 配置正常")
        
        report.append("")
        
        # 后端配置
        report.append("## 后端测试配置")
        report.append(f"- 框架: {backend_config['framework']}")
        report.append(f"- 配置文件: {backend_config['config_file']}")
        report.append(f"- 测试路径: {backend_config['test_paths']}")
        report.append(f"- 覆盖率目标: {backend_config['coverage_threshold']}%")
        
        if validation_results['backend']['issues']:
            report.append("- ⚠️ 问题:")
            for issue in validation_results['backend']['issues']:
                report.append(f"  - {issue}")
        else:
            report.append("- ✅ 配置正常")
        
        report.append("")
        
        # 总结
        report.append("## 总结")
        valid_configs = sum(1 for result in validation_results.values() if result['valid'])
        total_configs = len(validation_results)
        report.append(f"- 有效配置: {valid_configs}/{total_configs}")
        
        if valid_configs == total_configs:
            report.append("- 🎉 所有测试配置都正常！")
        else:
            report.append("- ⚠️ 部分配置需要修复")
        
        return "\n".join(report)

def main():
    """主函数"""
    print("🔧 测试配置管理器")
    print("=" * 50)
    
    manager = TestConfigManager()
    
    # 生成配置报告
    report = manager.generate_config_report()
    print(report)
    
    # 保存报告到文件
    report_file = manager.tests_dir / 'config-report.md'
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"\n📄 配置报告已保存到: {report_file}")

if __name__ == "__main__":
    main()
