# 🏗️ GitHub Trending Scraper - 项目架构文档

## 📋 概述

GitHub Trending Scraper 是一个现代化的全栈项目，用于抓取、分析和可视化 GitHub 趋势数据。项目采用 **Next.js 14** + **TypeScript** 作为前端，**Python 3.12** 作为爬虫和数据分析引擎，**PostgreSQL** + **Prisma** 作为数据层。

### 🎯 核心特性
- 🕷️ **智能爬虫系统**：多 Token 管理、速率限制、错误恢复
- 📊 **数据分析引擎**：代码分析、趋势计算、库依赖分析
- 🎨 **现代化 UI**：响应式设计、暗色模式、实时图表
- 🧪 **完整测试体系**：前后端测试、CI/CD、覆盖率报告
- 🔧 **开发者友好**：自动化工具、详细文档、跨平台支持

## 🗂️ 优化后的目录结构

### 📁 当前结构问题
- 文档文件散乱在根目录
- 测试文件分布不统一
- 工具脚本缺乏组织
- 配置文件混杂

### 🎯 建议的新架构

```
github-trending-scraper/
├── 📁 docs/                          # 📚 项目文档
│   ├── ARCHITECTURE.md               # 架构文档
│   ├── API.md                        # API 文档
│   ├── TESTING.md                    # 测试指南
│   ├── QUICK_START.md                # 快速开始
│   ├── DEPLOYMENT.md                 # 部署指南
│   └── CONTRIBUTING.md               # 贡献指南
│
├── 📁 src/                           # 🎨 前端源码
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # 仪表盘路由组
│   │   │   ├── dashboard/
│   │   │   ├── keywords/
│   │   │   ├── daily/
│   │   │   ├── weekly/
│   │   │   └── monthly/
│   │   ├── api/                      # API 路由
│   │   │   ├── keywords/
│   │   │   ├── repositories/
│   │   │   ├── stats/
│   │   │   ├── trending/
│   │   │   └── analysis/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/                   # 🧩 UI 组件
│   │   ├── ui/                       # 基础 UI 组件
│   │   ├── charts/                   # 图表组件
│   │   │   ├── trends-chart.tsx
│   │   │   ├── language-chart.tsx
│   │   │   └── library-chart.tsx
│   │   ├── features/                 # 功能组件
│   │   │   ├── keyword-search/
│   │   │   ├── repository-list/
│   │   │   └── analytics-dashboard/
│   │   └── layout/                   # 布局组件
│   │       ├── navbar.tsx
│   │       └── sidebar.tsx
│   │
│   ├── lib/                          # 🛠️ 工具库
│   │   ├── db/                       # 数据库相关
│   │   │   ├── prisma.ts
│   │   │   └── queries.ts
│   │   ├── api/                      # API 工具
│   │   │   ├── client.ts
│   │   │   └── types.ts
│   │   ├── utils/                    # 通用工具
│   │   │   ├── format.ts
│   │   │   ├── validation.ts
│   │   │   └── constants.ts
│   │   └── python-resolver.ts
│   │
│   └── types/                        # 🏷️ TypeScript 类型
│       ├── api.ts
│       ├── database.ts
│       └── components.ts
│
├── 📁 backend/                       # 🐍 Python 后端
│   ├── scraper/                      # 爬虫系统
│   │   ├── core/                     # 核心模块
│   │   │   ├── __init__.py
│   │   │   ├── token_manager.py      # Token 管理
│   │   │   ├── api_client.py         # GitHub API 客户端
│   │   │   └── rate_limiter.py       # 速率限制
│   │   ├── crawlers/                 # 爬虫实现
│   │   │   ├── __init__.py
│   │   │   ├── keyword_crawler.py
│   │   │   └── repository_crawler.py
│   │   ├── analyzers/                # 分析器
│   │   │   ├── __init__.py
│   │   │   ├── code_analyzer.py
│   │   │   └── trend_analyzer.py
│   │   ├── utils/                    # 工具函数
│   │   │   ├── __init__.py
│   │   │   ├── database.py
│   │   │   └── helpers.py
│   │   └── main.py                   # 入口文件
│   │
│   ├── analysis/                     # 数据分析
│   │   ├── processors/               # 数据处理器
│   │   │   ├── __init__.py
│   │   │   ├── trend_processor.py
│   │   │   └── library_processor.py
│   │   ├── generators/               # 报告生成器
│   │   │   ├── __init__.py
│   │   │   ├── json_generator.py
│   │   │   └── chart_generator.py
│   │   └── main.py
│   │
│   ├── config/                       # 配置文件
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   └── logging.py
│   │
│   ├── requirements/                 # 依赖管理
│   │   ├── base.txt                  # 基础依赖
│   │   ├── dev.txt                   # 开发依赖
│   │   └── test.txt                  # 测试依赖
│   │
│   └── pyproject.toml                # Python 项目配置
│
├── 📁 tests/                         # 🧪 测试文件
│   ├── frontend/                     # 前端测试
│   │   ├── __tests__/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   └── utils/
│   │   ├── jest.config.js
│   │   └── jest.setup.js
│   │
│   ├── backend/                      # 后端测试
│   │   ├── unit/                     # 单元测试
│   │   ├── integration/              # 集成测试
│   │   ├── fixtures/                 # 测试数据
│   │   └── conftest.py               # pytest 配置
│   │
│   └── e2e/                          # 端到端测试
│       ├── specs/
│       └── playwright.config.ts
│
├── 📁 tools/                         # 🔧 开发工具
│   ├── scripts/                      # 脚本文件
│   │   ├── setup/                    # 环境设置
│   │   │   ├── install-deps.sh
│   │   │   ├── setup-db.sh
│   │   │   └── check-env.js
│   │   ├── testing/                  # 测试脚本
│   │   │   ├── run-tests.sh
│   │   │   ├── run-tests.bat
│   │   │   └── test-setup.js
│   │   ├── deployment/               # 部署脚本
│   │   │   ├── build.sh
│   │   │   └── deploy.sh
│   │   └── maintenance/              # 维护脚本
│   │       ├── clean-cache.js
│   │       └── backup-db.sh
│   │
│   ├── generators/                   # 代码生成器
│   │   ├── component-generator.js
│   │   └── api-generator.js
│   │
│   └── validators/                   # 验证工具
│       ├── schema-validator.js
│       └── env-validator.js
│
├── 📁 database/                      # 🗄️ 数据库
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   ├── backups/                      # 数据库备份
│   └── scripts/                      # 数据库脚本
│       ├── init.sql
│       └── cleanup.sql
│
├── 📁 public/                        # 📦 静态资源
│   ├── assets/                       # 资源文件
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── data/                         # 静态数据
│   │   └── analytics/                # 分析结果
│   │
│   └── favicon.ico
│
├── 📁 config/                        # ⚙️ 配置文件
│   ├── next.config.js                # Next.js 配置
│   ├── tailwind.config.js            # Tailwind 配置
│   ├── tsconfig.json                 # TypeScript 配置
│   ├── eslint.config.js              # ESLint 配置
│   └── postcss.config.js             # PostCSS 配置
│
├── 📁 .github/                       # 🤖 GitHub 配置
│   ├── workflows/                    # GitHub Actions
│   │   ├── ci.yml
│   │   ├── codeql.yml
│   │   └── deploy.yml
│   ├── ISSUE_TEMPLATE/               # Issue 模板
│   ├── PULL_REQUEST_TEMPLATE.md      # PR 模板
│   └── dependabot.yml               # Dependabot 配置
│
├── 📄 README.md                      # 项目说明
├── 📄 CHANGELOG.md                   # 更新日志
├── 📄 LICENSE                        # 许可证
├── 📄 .env.example                   # 环境变量示例
├── 📄 .gitignore                     # Git 忽略文件
├── 📄 package.json                   # Node.js 依赖
└── 📄 docker-compose.yml             # Docker 配置
```
