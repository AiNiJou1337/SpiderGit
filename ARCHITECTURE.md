# 项目架构文档

## 概述

本项目是一个GitHub趋势爬虫系统，主要用于抓取和分析GitHub上的项目趋势数据。项目采用Next.js作为前端框架，使用Python作为后端爬虫和数据分析语言，PostgreSQL作为主数据库。

## 目录结构

```
github-trend-crawler/
├── app/                   # Next.js应用程序目录
│   ├── api/               # API路由
│   ├── (routes)/          # 页面路由
│   ├── components/        # 页面级组件
│   └── layout.tsx         # 应用布局
├── components/            # 共享UI组件
├── lib/                   # 工具库和共享函数
├── public/                # 静态资源
│   └── analytics/         # 分析数据文件
├── prisma/                # Prisma数据库模型
├── scraper/               # 爬虫代码
├── analysis/              # 数据分析代码
└── tools/                 # 工具和脚本
```

## 核心模块

### 1. 爬虫系统 (scraper/)

- **crawler.py**: 主爬虫程序，负责抓取GitHub仓库数据
- **code_analysis.py**: 代码分析程序，分析仓库中的代码文件
- **scheduler.py**: 爬虫调度器，管理爬虫任务
- **utils.py**: 爬虫工具函数

### 2. 数据分析 (analysis/)

- **data_analysis.py**: 数据分析模块，分析仓库数据并生成分析结果
- **analyze_trends.py**: 趋势分析模块，计算和生成趋势数据
- **library_analysis.py**: 库分析模块，专门分析代码中使用的库和包

### 3. 工具和脚本 (tools/)

- **clean_analytics.py**: 清理工具，清理临时文件和旧分析数据
- **regenerate_analytics.py**: 重新生成分析数据的工具
- **update_json_files.py**: 更新JSON文件的工具

### 4. 前端组件 (components/)

- **library-analysis.tsx**: 库分析组件，显示库使用的条形图
- **enhanced-library-analysis.tsx**: 高级库分析组件，提供按语言筛选的分析
- **library-stats.tsx**: 库统计组件，显示库使用的统计信息和饼图
- **trend-chart.tsx**: 趋势图表组件，显示趋势数据的图表
- **repository-table.tsx**: 仓库表格组件，显示仓库列表

### 5. API路由 (app/api/)

- **/api/trends**: 提供趋势数据的API
- **/api/keywords**: 关键词管理API
- **/api/repositories**: 仓库数据API
- **/api/libraries**: 库分析数据API
- **/api/crawl**: 爬虫控制API

## 数据流

1. **爬虫系统** 从GitHub抓取数据并存储到PostgreSQL数据库
2. **数据分析模块** 从数据库读取数据，进行分析并生成分析结果
3. **API路由** 从数据库或分析结果中读取数据，提供给前端
4. **前端组件** 调用API获取数据并展示给用户

## 关键技术

- **前端**: Next.js, React, TailwindCSS, Recharts (图表库)
- **后端**: Python, FastAPI (用于部分API)
- **数据库**: PostgreSQL, Prisma (ORM)
- **爬虫**: BeautifulSoup, Selenium, Requests
- **数据分析**: Pandas, NumPy
- **部署**: Docker, Vercel

## 配置项

主要配置文件:

- **next.config.js**: Next.js配置
- **prisma/schema.prisma**: 数据库模型定义
- **.env**: 环境变量配置
- **tailwind.config.js**: TailwindCSS配置

## 工作流程

1. 爬虫调度器定期启动爬虫任务
2. 爬虫抓取GitHub数据并存储到数据库
3. 数据分析模块分析数据并生成结果
4. 前端通过API获取数据并展示
5. 用户可以通过前端界面查看分析结果和趋势数据

## 维护与扩展

- **添加新关键词**: 通过管理界面或直接修改数据库添加
- **更新分析逻辑**: 修改analysis/目录下的分析代码
- **添加新图表**: 在components/目录添加新的图表组件
- **扩展API**: 在app/api/目录添加新的API路由

## 自动化任务

项目包含多个自动化脚本:

- **run_analysis.bat**: Windows批处理脚本，运行完整分析流程
- **update_json_files.py**: 更新所有JSON分析文件
- **tools/regenerate_analytics.py**: 重新生成分析数据 