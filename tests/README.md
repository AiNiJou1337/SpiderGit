# 项目测试

这里是项目的统一测试管理中心，包含所有测试套件、脚本和配置。集成了连接测试、爬虫测试、API测试等多种测试功能。

## 📁 目录结构

```
tests/
├── frontend/                   # 前端测试
│   ├── __tests__/             # Jest测试文件
│   │   ├── api/               # API测试
│   │   └── components/        # 组件测试
│   ├── jest.config.js         # Jest配置
│   └── jest.setup.js          # Jest设置
│
├── backend/                   # 后端测试
│   ├── test_*.py             # Python测试文件
│   └── conftest.py           # pytest配置
│
├── integration/              # 集成测试
│   ├── api/                  # API集成测试
│   ├── database/             # 数据库集成测试
│   └── services/             # 服务集成测试
│
├── e2e/                      # 端到端测试
│   ├── specs/                # 测试规范
│   ├── fixtures/             # 测试数据
│   └── config/               # E2E配置
│
├── scripts/                  # 测试脚本
│   ├── run-all-tests.py      # 统一测试执行器
│   ├── test-config-manager.py # 配置管理器
│   ├── connection-test.py    # 连接测试脚本
│   ├── test-data-manager.py  # 数据存储管理器
│   └── test-utils.py         # 测试工具
│
├── results/                  # 测试结果
│   ├── test-results-*.json   # 测试结果文件
│   ├── coverage/             # 覆盖率报告
│   └── reports/              # 测试报告
│
└── fixtures/                 # 测试数据
    ├── mock-data/            # 模拟数据
    ├── test-configs/         # 测试配置
    └── snapshots/            # 快照测试
```

## 🧪 测试套件

### 连接测试 (Connection Tests)
- **Token验证**: 检查GitHub Token环境变量配置
- **API连接**: 测试GitHub API基础连接
- **搜索功能**: 验证简单仓库搜索功能
- **速率限制**: 检查API速率限制状态

### 爬虫测试 (Crawler Tests)
- **关键词搜索**: 测试关键词搜索爬取功能
- **数据解析**: 验证仓库数据解析准确性
- **存储验证**: 检查数据存储和格式化
- **错误处理**: 测试异常情况处理

### API测试 (API Tests)
- **路由测试**: 测试Next.js API路由响应
- **参数验证**: 验证API参数处理
- **错误处理**: 测试API错误响应
- **性能测试**: 检查API响应时间

### 前端测试 (Frontend Tests)
- **组件测试**: 验证React组件的渲染和交互
- **用户交互**: 模拟用户操作和事件
- **路由测试**: 测试页面导航和路由
- **状态管理**: 验证应用状态管理

### 后端测试 (Backend Tests)
- **单元测试**: 测试Python模块和函数
- **数据处理**: 测试爬虫和数据分析逻辑
- **工具函数**: 验证辅助工具函数
- **配置加载**: 测试配置文件加载

### 集成测试 (Integration Tests)
- **系统集成**: 验证各组件间的协作
- **数据流测试**: 测试完整的数据处理流程
- **外部服务**: 测试第三方API集成
- **文件系统**: 测试文件读写操作

## 🚀 快速开始

### 运行所有测试
```bash
# 使用Python脚本
python tests/scripts/run-all-tests.py

# 使用npm命令
npm run test:all
```

### 运行特定测试套件
```bash
# 前端测试
npm run test:frontend

# 后端测试
npm run test:backend

# 集成测试
python tests/scripts/run-integration-tests.py

# E2E测试
npm run test:e2e
```

### 生成覆盖率报告
```bash
# 前端覆盖率
npm run test:coverage

# 后端覆盖率
cd backend && python -m pytest --cov=backend --cov-report=html
```

## 🔧 配置管理

### 查看测试配置
```bash
python tests/scripts/test-config-manager.py
```

### 配置文件位置
- **前端**: `tests/frontend/jest.config.js`
- **后端**: `backend/pyproject.toml`
- **集成**: `tests/integration/config.json`
- **E2E**: `tests/e2e/playwright.config.js`

## 📊 测试报告

测试结果会自动保存到 `tests/results/` 目录：
- **JSON格式**: 详细的测试结果数据
- **HTML报告**: 可视化的测试报告
- **覆盖率报告**: 代码覆盖率分析

## 🎯 覆盖率目标

- **前端测试**: ≥ 80%
- **后端测试**: ≥ 60%
- **集成测试**: ≥ 70%
- **整体覆盖率**: ≥ 75%

