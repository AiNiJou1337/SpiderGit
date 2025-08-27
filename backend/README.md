# GitHub Trending Scraper - Backend

<div align="center">
  <img src="../public/logo.png" alt="GitHub趋势爬虫" width="120" height="120" />
  <h1>GitHub 趋势爬虫系统 - 后端模块</h1>
  <p><strong>智能化的GitHub数据采集与分析引擎</strong></p>
</div>

GitHub 趋势爬虫系统的后端模块，提供完整的数据爬取、分析和处理功能。采用现代化的Python架构，支持多种数据源和智能化的数据处理流程。

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

### 🕷️ 智能爬虫系统
- **GitHub Trending HTML爬虫**: 解析GitHub Trending页面，获取日/周/月度热门项目
- **GitHub API客户端**: 通过REST API获取详细的仓库信息和统计数据
- **多Token管理**: 智能轮换GitHub API Token，突破速率限制
- **自动重试机制**: 网络异常时自动重试，确保数据采集的稳定性

### 📊 数据分析引擎
- **代码分析器**: 分析项目代码，提取使用的编程语言和依赖库
- **趋势分析**: 计算项目的星标增长趋势和热度变化
- **语言统计**: 统计不同编程语言的流行度和分布情况
- **时间序列分析**: 生成历史数据追踪和趋势预测

### 🔄 任务调度系统
- **定时任务**: 支持定时执行数据采集任务
- **任务队列**: 管理多个爬取任务的执行顺序
- **状态监控**: 实时监控任务执行状态和进度
- **错误恢复**: 任务失败时自动重试和错误报告

### 💾 数据存储管理
- **JSON文件存储**: 轻量级的数据存储方案，便于部署和维护
- **时间序列数据**: 按时间维度组织数据，支持历史追踪
- **增量更新**: 只更新变化的数据，提高效率
- **数据备份**: 自动备份重要数据，防止数据丢失

## 📦 安装和配置

### 🔧 环境要求
- **Python**: 3.8+ (推荐 3.9+)
- **包管理器**: pip 或 poetry
- **操作系统**: Windows/Linux/macOS
- **内存**: 建议 2GB+ 可用内存

### 📥 安装依赖

#### 方式一：使用 pip (推荐)
```bash
# 进入后端目录
cd backend

# 安装基础依赖
pip install -r requirements/base.txt

# 安装开发依赖（可选，包含测试和代码质量工具）
pip install -r requirements/dev.txt
```

#### 方式二：使用 poetry
```bash
# 进入后端目录
cd backend

# 安装所有依赖
poetry install

# 只安装生产依赖
poetry install --only main
```

### ⚙️ 环境配置

#### 1. GitHub Token 配置
创建 `.env` 文件并配置GitHub Token：

```bash
# 主要Token（必需）
GITHUB_TOKEN_GMAIL=your_github_token_here

# 备用Token（可选，用于提高API限制）
GITHUB_TOKEN_QQ=your_second_token_here
GITHUB_TOKEN_BACKUP1=your_third_token_here
```

#### 2. 获取GitHub Token
1. 访问 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 选择权限：`public_repo`, `read:user`
4. 复制生成的token到 `.env` 文件

#### 3. 数据目录配置
```bash
# 创建数据目录
mkdir -p ../public/trends/data
mkdir -p ../public/trends/time_series
mkdir -p ../public/trends/backups
```

## 🎯 使用方法

### 🚀 快速开始

#### 1. 基础趋势数据爬取
```bash
# 进入后端目录
cd backend

# 爬取GitHub Trending数据（日/周/月）
python scraper/trending_manager.py

# 查看生成的数据文件
ls ../public/trends/data/
```

#### 2. 时间序列数据收集
```bash
# 收集历史趋势数据
python scraper/time_series_trending_manager.py

# 查看时间序列数据
ls ../public/trends/time_series/
```

#### 3. 关键词搜索爬虫
```bash
# 基于关键词搜索仓库
python scraper/crawlers/keyword_scraper.py --keyword "machine learning" --limit 50

# 多关键词搜索
python scraper/crawlers/keyword_scraper.py --keywords "react,vue,angular" --languages "javascript,typescript"
```

### 🔄 定时任务调度

#### 启动调度器
```bash
# 启动定时任务调度器
python scraper/scheduler.py

# 后台运行（Linux/macOS）
nohup python scraper/scheduler.py > scheduler.log 2>&1 &
```

#### 自定义调度配置
编辑 `scraper/scheduler.py` 中的调度设置：
```python
# 每天上午9点执行
schedule.every().day.at("09:00").do(run_trending_scraper)

# 每小时执行一次
schedule.every().hour.do(run_trending_scraper)

# 每周一执行
schedule.every().monday.do(run_weekly_analysis)
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
