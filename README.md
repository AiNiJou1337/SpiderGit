# (本项目全文为AI生成，仅作为学习参考使用，侵删）

# GitHub趋势爬虫

一个用于抓取和分析GitHub趋势数据的系统，提供数据可视化和趋势分析功能。

## 项目概述

该项目通过爬虫自动抓取GitHub上各种关键词相关的仓库，分析它们的代码、语言分布、使用的库/包等信息，生成分析报告和可视化图表。系统包括爬虫、数据分析和前端展示三个主要部分。

### 主要特性

- 自动抓取GitHub仓库数据
- 分析代码文件和使用的库/包
- 生成趋势图表和分析报告
- 交互式数据可视化
- 支持按关键词和语言筛选

## 项目结构

```
github-trend-crawler/
├── app/                   # Next.js应用程序目录
├── components/            # 共享UI组件
├── lib/                   # 工具库和共享函数
├── public/                # 静态资源
│   └── analytics/         # 分析数据文件
├── prisma/                # Prisma数据库模型
├── scraper/               # 爬虫代码
├── analysis/              # 数据分析代码
└── tools/                 # 工具和脚本
```

有关项目架构的详细说明，请参阅 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 安装

### 前提条件

- Node.js (16.x 或更高版本)
- Python 3.8+
- PostgreSQL 12+

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/your-username/github-trend-crawler.git
   cd github-trend-crawler
   ```

2. 安装前端依赖
   ```bash
   npm install
   ```

3. 安装Python依赖
   ```bash
   pip install -r requirements.txt
   ```

4. 配置环境变量
   - 复制`.env.example`为`.env`
   - 填写必要的环境变量，包括数据库连接信息

5. 初始化数据库
   ```bash
   npx prisma db push
   ```

## 使用方法

### 启动开发服务器

```bash
npm run dev
```

### 运行爬虫

```bash
python scraper/crawler.py --keyword "机器学习"
```

### 生成分析数据

```bash
python analysis/data_analysis.py --keyword "机器学习"
```

### 生成趋势数据

```bash
python analysis/analyze_trends.py
```

### 构建生产版本

```bash
npm run build
npm start
```

## 工具和脚本

项目包含多个实用工具脚本，位于`tools/`目录：

- **clean_analytics.py**: 清理临时文件和旧分析数据
  ```bash
  python tools/clean_analytics.py
  ```

- **regenerate_analytics.py**: 重新生成分析数据
  ```bash
  python tools/regenerate_analytics.py
  ```

## API参考

系统提供以下主要API:

- `/api/trends`: 获取趋势数据
- `/api/keywords`: 管理关键词
- `/api/repositories`: 获取仓库数据
- `/api/libraries`: 获取库分析数据
- `/api/crawl`: 控制爬虫任务

有关API详细用法，请参考API文档。

## 开发指南

### 添加新的关键词

1. 通过管理界面添加
2. 或直接插入数据库:
   ```sql
   INSERT INTO keywords (text, created_at) VALUES ('新关键词', NOW());
   ```

### 添加新的分析图表

1. 在`components/`目录下创建新的图表组件
2. 更新相关页面引用该组件
3. 如需新的数据格式，更新数据分析模块

### 修改爬虫逻辑

爬虫代码位于`scraper/`目录，主要文件:

- `crawler.py`: 爬虫主程序
- `code_analysis.py`: 代码分析

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork本仓库
2. 创建您的功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开Pull Request

## 许可证

本项目采用MIT许可证 - 详情请参阅[LICENSE](LICENSE)文件。

## 项目清理

项目版本迭代过程中，以下文件已被整合或移除：

- 根目录的`analyze_trends.py`已移除，请使用`analysis/analyze_trends.py`
- `/app/api/analytics/route.ts`已合并到`/app/api/analysis/route.ts`
