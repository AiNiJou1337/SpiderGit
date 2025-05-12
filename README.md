# GitHub Trending 数据抓取项目

这是一个基于Next.js和Python的GitHub趋势项目抓取系统，可以实时追踪GitHub上最热门的开源项目，并支持按时间段和编程语言进行筛选。

## 功能特点

- 抓取GitHub每日、每周和每月趋势仓库数据
- 支持按编程语言筛选热门项目
- 数据持久化存储到PostgreSQL数据库
- 响应式Web界面展示趋势数据
- 定时自动更新数据

## 技术栈

- **前端**: Next.js, React, Tailwind CSS, ShadcnUI
- **后端**: Next.js API Routes, Prisma ORM
- **数据库**: PostgreSQL
- **爬虫**: Python, BeautifulSoup4
- **调度**: Python Schedule

## 安装步骤

### 前提条件

- Node.js 16+
- Python 3.7+
- PostgreSQL 数据库

### 安装过程

1. 克隆项目并安装依赖

```bash
npm install
```

2. 配置环境变量

确保`.env`文件中包含正确的数据库连接信息：

```
DATABASE_URL="postgresql://用户名:密码@localhost:5432/github_trending"
NODE_ENV="development"
PORT=3000
```

3. 初始化数据库并运行爬虫

```bash
npm run init-db
```

4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 项目结构

```
├── app/                  # Next.js 应用目录
│   ├── api/              # API 路由
│   │   └── trending/     # 趋势数据API
│   ├── page.tsx          # 主页面
│   └── ...
├── components/           # React组件
├── lib/                  # 工具库
│   └── db.ts            # 数据库连接
├── prisma/               # Prisma ORM配置
│   └── schema.prisma    # 数据库模型定义
├── scraper/              # Python爬虫脚本
│   ├── main.py          # 爬虫主程序
│   └── scheduler.py     # 定时任务调度器
└── scripts/              # 辅助脚本
    └── init-db.js       # 数据库初始化脚本
```

## 使用说明

### 查看趋势数据

应用首页展示GitHub趋势数据，可以通过顶部标签切换不同时间段（今日、本周、本月）的趋势数据。

### 按语言筛选

在每个时间段的页面底部，可以看到语言筛选选项，点击对应的语言标签可以筛选出特定编程语言的热门项目。

### 手动更新数据

如需手动更新数据，可以运行：

```bash
python scraper/main.py
```

### 设置定时更新

启动定时任务调度器：

```bash
python scraper/scheduler.py
```

## 项目结构

```
├── app/                  # Next.js前端应用
├── prisma/               # Prisma数据库模型和迁移
├── components/           # React组件
├── lib/                  # 工具函数
├── public/               # 静态资源
├── scraper/              # Python爬虫脚本
│   ├── main.py           # 爬虫主程序
│   ├── requirements.txt  # Python依赖
│   └── scheduler.py      # 定时任务调度器
├── .env                  # 环境变量
├── next.config.js        # Next.js配置
├── package.json          # 项目依赖
└── tsconfig.json         # TypeScript配置
```

## 技术栈

- **前端**: Next.js 13 (App Router), React, TypeScript, TailwindCSS, ShadcnUI
- **后端**: Python (爬虫), Next.js API Routes
- **数据库**: PostgreSQL, Prisma ORM
- **部署**: 可部署在Vercel (前端) 和任何支持Python的服务器 (爬虫)

## 功能特性

- 自动抓取GitHub Trending页面数据
- 数据存储在PostgreSQL数据库中
- 美观的用户界面展示趋势项目
- 支持按语言、时间段筛选
- 定时任务自动更新数据

## 快速开始

### 前端应用

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 数据库设置

```bash
# 初始化Prisma
npx prisma migrate dev --name init
```

### 爬虫脚本

```bash
# 安装Python依赖
cd scraper
pip install -r requirements.txt

# 运行爬虫
python main.py
```

## 环境变量

创建一个`.env`文件，包含以下内容：

```
DATABASE_URL="postgresql://username:password@localhost:5432/github_trending"
```

## 开发计划

- [x] 项目初始化
- [ ] 数据库模型设计
- [ ] Python爬虫实现
- [ ] 前端界面开发
- [ ] 定时任务系统
- [ ] 部署文档