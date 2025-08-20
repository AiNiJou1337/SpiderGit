# 测试指南

本文档详细说明如何在 GitHub Trending Scraper 项目中执行前端和后端测试。

## 📋 目录

- [测试概述](#测试概述)
- [前端测试 (Jest)](#前端测试-jest)
- [后端测试 (pytest)](#后端测试-pytest)
- [集成测试](#集成测试)
- [CI/CD 测试](#cicd-测试)
- [测试最佳实践](#测试最佳实践)
- [故障排除](#故障排除)

## 🎯 测试概述

项目采用**双重测试体系**：
- **前端测试**：Jest + React Testing Library
- **后端测试**：pytest + 自定义测试工具

### 🏗️ 测试架构

```
测试体系
├── 前端测试 (Jest)
│   ├── 组件测试
│   ├── API 路由测试
│   ├── 工具函数测试
│   └── 集成测试
├── 后端测试 (pytest)
│   ├── 爬虫功能测试
│   ├── 数据分析测试
│   ├── Token 管理测试
│   └── 数据库测试
└── E2E 测试 (计划中)
    ├── 用户流程测试
    └── 跨系统集成测试
```

## 🎨 前端测试 (Jest)

### 📦 测试环境配置

**依赖包：**
```json
{
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/react": "^16.1.0",
  "@testing-library/user-event": "^14.5.2",
  "jest": "^29.7.0",
  "jest-environment-jsdom": "^29.7.0"
}
```

**配置文件：**
- `jest.config.js`：主配置文件
- `jest.setup.js`：测试环境设置

### 🚀 运行前端测试

```bash
# 运行所有前端测试
npm run test

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test -- components/navbar.test.tsx

# 运行特定测试套件
npm test -- --testNamePattern="Navbar"
```

### 📊 测试覆盖率

目标覆盖率：
- **语句覆盖率**：≥ 80%
- **分支覆盖率**：≥ 75%
- **函数覆盖率**：≥ 85%
- **行覆盖率**：≥ 80%

### 🧪 测试示例

**组件测试示例：**
```typescript
// __tests__/components/navbar.test.tsx
import { render, screen } from '@testing-library/react'
import Navbar from '@/components/navbar'

describe('Navbar', () => {
  it('renders navigation links', () => {
    render(<Navbar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Keywords')).toBeInTheDocument()
  })
})
```

## 🐍 后端测试 (pytest)

### 📦 测试环境配置

**依赖包：**
```txt
pytest==7.4.4
pytest-asyncio==0.21.1
pytest-cov==4.1.0
pytest-mock==3.12.0
requests-mock==1.11.0
```

**配置文件：**
- `scraper/pyproject.toml`：pytest 配置
- `scraper/tests/conftest.py`：测试夹具

### 🚀 运行后端测试

```bash
# 进入后端目录
cd scraper

# 运行所有测试
python -m pytest

# 详细输出
python -m pytest -v

# 生成覆盖率报告
python -m pytest --cov=. --cov-report=html

# 运行特定测试文件
python -m pytest tests/test_keyword_scraper.py

# 运行特定测试函数
python -m pytest tests/test_keyword_scraper.py::test_github_token_manager
```

### 🧪 测试分类

使用 pytest 标记系统：

```python
# 单元测试
@pytest.mark.unit
def test_token_validation():
    pass

# 集成测试
@pytest.mark.integration
def test_github_api_integration():
    pass

# 慢速测试
@pytest.mark.slow
def test_full_scraping_process():
    pass
```

运行特定类型的测试：
```bash
# 只运行单元测试
python -m pytest -m unit

# 跳过慢速测试
python -m pytest -m "not slow"

# 只运行集成测试
python -m pytest -m integration
```

## 🔗 集成测试

### 🌐 API 集成测试

测试前后端 API 集成：

```typescript
// __tests__/api/integration.test.ts
describe('API Integration', () => {
  it('fetches trending repositories', async () => {
    const response = await fetch('/api/trending')
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('repositories')
  })
})
```

### 🗄️ 数据库集成测试

```python
# scraper/tests/test_database_integration.py
@pytest.mark.integration
def test_database_connection():
    """测试数据库连接和基本操作"""
    # 测试数据库连接
    # 测试数据插入和查询
    pass
```

## 🤖 CI/CD 测试

### 📋 GitHub Actions 工作流

```yaml
# .github/workflows/test.yml
name: 测试流水线

on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - run: cd scraper && pip install -r requirements-dev.txt
      - run: cd scraper && python -m pytest --cov=.
```

### 🔍 代码质量检查

```yaml
  code-quality:
    runs-on: ubuntu-latest
    steps:
      - name: 前端代码检查
        run: |
          npm run lint
          npm run type-check
          
      - name: 后端代码检查
        run: |
          cd scraper
          flake8 .
          black --check .
          mypy .
```

## 📋 测试最佳实践

### ✅ 前端测试最佳实践

1. **组件测试**：
   - 测试用户交互，不测试实现细节
   - 使用 `screen.getByRole()` 而不是 `getByTestId()`
   - 模拟用户行为，不直接调用组件方法

2. **API 测试**：
   - 模拟外部依赖
   - 测试错误处理
   - 验证响应格式

3. **工具函数测试**：
   - 测试边界条件
   - 测试错误输入
   - 保持测试简单和快速

### ✅ 后端测试最佳实践

1. **爬虫测试**：
   - 使用 `requests-mock` 模拟 HTTP 请求
   - 测试错误恢复机制
   - 验证数据解析正确性

2. **数据分析测试**：
   - 使用固定的测试数据集
   - 验证计算结果的准确性
   - 测试大数据集的性能

3. **数据库测试**：
   - 使用测试数据库
   - 每个测试后清理数据
   - 测试事务和并发

## 🚨 故障排除

### 常见前端测试问题

**问题 1: 模块解析错误**
```
Cannot resolve module '@/components/navbar'
```

**解决方案：**
```javascript
// jest.config.js
module.exports = {
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  }
}
```

**问题 2: DOM 环境错误**
```
ReferenceError: document is not defined
```

**解决方案：**
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom'
}
```

### 常见后端测试问题

**问题 1: 导入路径错误**
```
ModuleNotFoundError: No module named 'keyword_scraper'
```

**解决方案：**
```python
# 在测试文件中添加路径
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
```

**问题 2: 数据库连接错误**
```
psycopg2.OperationalError: could not connect to server
```

**解决方案：**
```python
# 使用测试数据库或 SQLite
@pytest.fixture
def test_db():
    # 设置测试数据库
    pass
```

## 📊 测试报告

### 📈 覆盖率报告

**前端覆盖率：**
- 生成位置：`coverage/lcov-report/index.html`
- 查看命令：`npm run test:coverage && open coverage/lcov-report/index.html`

**后端覆盖率：**
- 生成位置：`scraper/htmlcov/index.html`
- 查看命令：`cd scraper && python -m pytest --cov=. --cov-report=html`

### 📋 测试报告格式

**JUnit XML 格式**（用于 CI）：
```bash
# 前端
npm test -- --ci --coverage --testResultsProcessor=jest-junit

# 后端
python -m pytest --junitxml=test-results.xml
```

## 🎯 测试策略

### 🔄 测试金字塔

```
        /\
       /  \
      / E2E \     ← 少量端到端测试
     /______\
    /        \
   / 集成测试  \   ← 适量集成测试
  /__________\
 /            \
/ 单元测试      \  ← 大量单元测试
/______________\
```

### 📅 测试执行策略

- **开发时**：运行相关的单元测试
- **提交前**：运行完整测试套件
- **CI/CD**：运行所有测试 + 代码质量检查
- **发布前**：运行 E2E 测试

---

通过这个完整的测试体系，我们确保了代码质量和系统稳定性。测试不仅是质量保证，更是开发过程中的安全网。
