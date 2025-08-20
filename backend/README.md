# GitHub Trending Scraper - Backend

GitHub 趋势爬虫系统的后端模块，提供完整的数据爬取、分析和处理功能。

## 🏗️ 架构概览

```
backend/
├── scraper/                    # 爬虫核心模块
│   ├── core/                  # 核心组件
│   │   ├── token_manager.py   # GitHub Token 管理
│   │   └── api_client.py      # GitHub API 客户端
│   ├── analyzers/             # 数据分析器
│   │   ├── code_analyzer.py   # 代码分析器
│   │   └── data_analysis.py   # 数据统计分析
│   ├── crawlers/              # 爬虫实现
│   │   ├── trending_crawler.py    # 趋势爬虫
│   │   └── keyword_scraper.py     # 关键词爬虫
│   ├── main.py                # 主程序入口
│   └── scheduler.py           # 定时任务调度
├── requirements/              # 依赖管理
│   ├── base.txt              # 基础依赖
│   └── dev.txt               # 开发依赖
└── pyproject.toml            # 项目配置
```

## 🚀 核心功能

### 1. 智能 Token 管理
- 多 GitHub Token 自动轮换
- 速率限制智能处理
- Token 状态实时监控

### 2. 趋势数据爬取
- 每日/每周/每月趋势仓库
- 多语言分类爬取
- 仓库详细信息获取

### 3. 关键词搜索
- 基于关键词的仓库搜索
- 代码结构分析
- 依赖库统计

### 4. 数据分析
- 编程语言分布分析
- 星数趋势统计
- 主题标签分析
- 仓库创建时间趋势

### 5. 定时任务
- 自动化数据爬取
- 灵活的调度配置
- 异常处理和恢复

## 📦 安装和配置

### 环境要求
- Python 3.8+
- pip 或 poetry

### 安装依赖

```bash
# 基础依赖
pip install -r requirements/base.txt

# 开发依赖（包含测试和代码质量工具）
pip install -r requirements/dev.txt
```

### 环境变量配置

创建 `.env` 文件：

```env
# GitHub API Tokens (多个用逗号分隔)
GITHUB_TOKENS=ghp_token1,ghp_token2,ghp_token3

# 或单个 Token
GITHUB_TOKEN=ghp_your_token_here

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/github_trending

# 日志级别
LOG_LEVEL=INFO
```

## 🎯 使用方法

### 1. 运行主爬虫程序

```bash
# 运行完整的爬取任务
python -m backend.scraper.main

# 或使用安装的命令
github-scraper
```

### 2. 启动定时任务调度器

```bash
# 启动调度器
python -m backend.scraper.scheduler

# 或使用安装的命令
github-scheduler
```

### 3. 关键词搜索

```bash
# 搜索特定关键词
python -m backend.scraper.crawlers.keyword_scraper "machine learning" --max-results 50

# 包含代码分析
python -m backend.scraper.crawlers.keyword_scraper "react" --analyze-code --output-dir results
```

### 4. 数据分析

```bash
# 分析已爬取的数据
python -m backend.scraper.analyzers.data_analysis data.json --output analysis_report.json

# 或使用安装的命令
github-analyzer data.json -o report.json
```

## 🧪 测试

```bash
# 运行所有测试
pytest

# 运行特定测试
pytest tests/backend/test_keyword_scraper.py

# 生成覆盖率报告
pytest --cov=backend --cov-report=html
```

## 🔧 开发工具

### 代码格式化
```bash
# 格式化代码
black backend/

# 排序导入
isort backend/
```

### 代码质量检查
```bash
# 语法检查
flake8 backend/

# 类型检查
mypy backend/

# 安全检查
bandit -r backend/
```

## 📊 API 速率限制

GitHub API 有以下限制：
- 未认证请求：60 次/小时
- 认证请求：5000 次/小时
- 搜索 API：30 次/分钟

本系统通过以下方式优化：
- 多 Token 轮换使用
- 智能速率限制检测
- 自动等待和重试机制

## 🔍 监控和日志

系统提供完整的日志记录：
- 爬取进度和状态
- API 调用统计
- 错误和异常信息
- 性能指标

日志文件位置：
- `scraper.log` - 主程序日志
- `scheduler.log` - 调度器日志
- `keyword_scraper.log` - 关键词爬虫日志
- `data_analysis.log` - 数据分析日志

## 🚨 注意事项

1. **API Token 安全**：请妥善保管 GitHub Token，不要提交到版本控制
2. **速率限制**：合理设置爬取频率，避免触发 GitHub 的反爬机制
3. **数据存储**：大量数据建议使用数据库存储而非 JSON 文件
4. **异常处理**：网络异常时系统会自动重试，但请监控日志

## 📈 性能优化

- 使用异步 HTTP 请求提高并发性能
- 实现智能缓存减少重复请求
- 批量处理数据提高效率
- 定期清理过期数据

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 LICENSE 文件
