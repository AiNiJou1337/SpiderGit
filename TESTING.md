# 测试指南

本文档详细说明如何在 GitHub Trending Scraper 项目中执行前端和后端测试。

## 📋 目录

- [快速开始](#快速开始)
- [前端测试](#前端测试)
- [Python 后端测试](#python-后端测试)
- [CI/CD 测试](#cicd-测试)
- [测试覆盖率](#测试覆盖率)
- [故障排除](#故障排除)

## 🚀 快速开始

### 环境准备

1. **安装前端依赖**：
   ```bash
   npm install
   ```

2. **安装 Python 测试依赖**：
   ```bash
   cd scraper
   pip install -r requirements-dev.txt
   ```

3. **验证环境**：
   ```bash
   # 检查 Node.js 版本
   node --version  # 应该 >= 18.0.0
   
   # 检查 Python 版本
   python --version  # 应该 >= 3.12.0
   ```

### 一键测试

```bash
# 运行所有测试
npm run test:all
```

## 🌐 前端测试

### 可用的测试命令

```bash
# 运行所有前端测试
npm test

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 仅运行 API 测试
npm test -- --testPathPattern=api

# 仅运行组件测试
npm test -- --testPathPattern=components
```

### 测试文件结构

```
__tests__/
├── api/
│   ├── keywords.test.ts      # 关键词 API 测试
│   └── repositories.test.ts  # 仓库 API 测试
└── components/
    ├── Dashboard.test.tsx    # 仪表盘组件测试
    └── Navbar.test.tsx       # 导航栏组件测试
```

### 前端测试示例

```bash
# 运行特定测试文件
npm test -- __tests__/api/keywords.test.ts

# 运行匹配模式的测试
npm test -- --testNamePattern="关键词"

# 详细输出
npm test -- --verbose
```

### 前端测试覆盖的功能

- ✅ **API 路由测试**：
  - 关键词搜索和创建
  - 爬取任务管理
  - 数据库交互
  - 错误处理

- ✅ **组件测试**：
  - 仪表盘数据展示
  - 图表渲染
  - 用户交互
  - 状态管理

## 🐍 Python 后端测试

### 可用的测试命令

```bash
cd scraper

# 运行所有 Python 测试
pytest

# 详细输出
pytest -v

# 运行特定测试文件
pytest tests/test_keyword_scraper.py

# 运行特定测试类
pytest tests/test_keyword_scraper.py::TestGitHubTokenManager

# 生成覆盖率报告
pytest --cov=. --cov-report=html

# 并行运行测试（如果安装了 pytest-xdist）
pytest -n auto
```

### Python 测试文件结构

```
scraper/
├── tests/
│   ├── __init__.py
│   ├── test_keyword_scraper.py    # 爬虫核心功能测试
│   ├── test_data_analysis.py      # 数据分析测试
│   └── test_code_analyzer.py      # 代码分析测试
├── requirements-dev.txt           # 测试依赖
└── pyproject.toml                # 测试配置
```

### Python 测试覆盖的功能

- ✅ **GitHub Token 管理**：
  - Token 自动发现和验证
  - 速率限制检查
  - 错误计数和恢复
  - 轮换机制

- ✅ **API 请求处理**：
  - 认证和无认证请求
  - 重试机制
  - 错误处理
  - 超时处理

- ✅ **数据处理**：
  - 仓库数据解析
  - 代码分析
  - 数据库操作

### Python 代码质量检查

```bash
cd scraper

# 代码格式检查
black --check .

# 自动格式化
black .

# 导入排序检查
isort --check-only .

# 自动排序导入
isort .

# 语法和风格检查
flake8 . --max-line-length=88 --extend-ignore=E203,W503

# 安全检查
bandit -r . -f json
```

## 🔄 CI/CD 测试

### GitHub Actions 工作流

项目配置了自动化 CI/CD 流程，在以下情况触发：

- 推送到 `main` 或 `develop` 分支
- 创建 Pull Request

### CI 检查项目

1. **前端质量检查**：
   - ESLint 代码规范
   - TypeScript 类型检查
   - Next.js 构建验证

2. **Python 爬虫检查**：
   - 语法检查 (Flake8)
   - 格式检查 (Black)
   - 模块导入验证

3. **API 和数据库**：
   - Prisma 模式验证
   - 数据库连接测试
   - API 路由检查

4. **安全检查**：
   - 依赖安全审计
   - 敏感文件检测

### 本地模拟 CI 环境

```bash
# 模拟完整 CI 检查
npm run ci:check

# 或者分步执行
npm run lint
npm run type-check
npm run build
cd scraper && flake8 . && black --check .
```

## 📊 测试覆盖率

### 前端覆盖率

```bash
# 生成 HTML 覆盖率报告
npm run test:coverage

# 查看报告
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

### Python 覆盖率

```bash
cd scraper

# 生成 HTML 覆盖率报告
pytest --cov=. --cov-report=html

# 查看报告
open htmlcov/index.html  # macOS
start htmlcov/index.html # Windows
```

### 覆盖率目标

- **前端**：目标 70%+
- **Python**：目标 70%+
- **关键模块**：目标 90%+

## 🔧 故障排除

### 常见问题

#### 1. 前端测试失败

```bash
# 清除缓存
npm test -- --clearCache

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

#### 2. Python 测试失败

```bash
# 检查 Python 版本
python --version

# 重新安装依赖
pip install -r requirements-dev.txt

# 检查模块导入
python -c "import keyword_scraper; print('OK')"
```

#### 3. 数据库连接问题

```bash
# 检查环境变量
echo $DATABASE_URL

# 测试数据库连接
npx prisma db push
```

#### 4. GitHub Token 问题

```bash
# 检查 Token 配置
echo $GITHUB_TOKEN_MAIN

# 验证 Token 有效性
curl -H "Authorization: token $GITHUB_TOKEN_MAIN" https://api.github.com/rate_limit
```

### 调试技巧

1. **使用详细输出**：
   ```bash
   npm test -- --verbose
   pytest -v -s
   ```

2. **运行单个测试**：
   ```bash
   npm test -- --testNamePattern="特定测试名称"
   pytest tests/test_file.py::test_function
   ```

3. **跳过慢速测试**：
   ```bash
   pytest -m "not slow"
   ```

## 📝 编写新测试

### 前端测试模板

```typescript
// __tests__/api/example.test.ts
describe('Example API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle success case', async () => {
    // 测试逻辑
  })

  it('should handle error case', async () => {
    // 错误处理测试
  })
})
```

### Python 测试模板

```python
# tests/test_example.py
import pytest
from unittest.mock import Mock, patch

class TestExample:
    def test_success_case(self):
        # 测试逻辑
        pass
    
    def test_error_case(self):
        # 错误处理测试
        pass
```

## 🎯 最佳实践

1. **测试命名**：使用描述性的测试名称
2. **Mock 使用**：适当使用 Mock 隔离外部依赖
3. **边界测试**：测试边界条件和错误情况
4. **持续更新**：新功能必须包含相应测试
5. **文档同步**：测试文档与代码保持同步

---

更多详细信息，请参考：
- [Jest 文档](https://jestjs.io/docs/getting-started)
- [pytest 文档](https://docs.pytest.org/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
