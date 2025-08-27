# 🚀 GitHub趋势爬虫平台 - 快速开始指南

<div align="center">
  <img src="../public/logo.png" alt="GitHub趋势爬虫" width="120" height="120" />
  <h1>快速开始指南</h1>
  <p><strong>5分钟内启动GitHub趋势爬虫与分析平台</strong></p>
</div>

本指南帮助您快速设置和运行GitHub趋势爬虫与分析平台，体验完整的数据采集和分析功能。

## 📋 前置要求

确保您的系统已安装：

- **Node.js 18+** - [下载地址](https://nodejs.org/) (推荐 20+)
- **Python 3.8+** - [下载地址](https://www.python.org/) (推荐 3.9+)
- **Git** - [下载地址](https://git-scm.com/)
- **GitHub Token** - [获取地址](https://github.com/settings/tokens)

## ⚡ 快速启动（推荐）

### 🎯 方法一：标准安装流程

```bash
# 1. 克隆项目
git clone https://github.com/AiNiJou1337/SpiderGit.git
cd SpiderGit

# 2. 安装前端依赖
npm install

# 3. 安装Python依赖
cd backend
pip install -r requirements/base.txt
cd ..

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加您的GitHub Token
```

### 🚀 立即体验

```bash
# 启动应用
npm run dev

# 访问应用
# 首页: http://localhost:3000
# Dashboard: http://localhost:3000/dashboard
# Trends: http://localhost:3000/trends
```
- ✅ 设置数据库
- ✅ 配置环境变量
- ✅ 运行初始测试

### 🎯 方法二：手动设置

如果自动化脚本失败，请按以下步骤手动设置：

#### 1. 📦 安装依赖

```bash
# 安装 Node.js 依赖
npm install

# 安装 Python 依赖
cd backend
pip install -r requirements/base.txt
pip install -r requirements/dev.txt
cd ..
```

#### 2. ⚙️ 配置环境变量

创建 `.env` 文件：

```env
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/github_trends"

# GitHub API Token（必需）
GITHUB_TOKEN_MAIN=ghp_your_token_here
GITHUB_TOKEN_BACKUP1=ghp_your_backup_token_here
GITHUB_TOKEN_BACKUP2=ghp_your_backup_token_here

# 可选配置
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**获取 GitHub Token：**
1. 访问 [GitHub Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 选择权限：`public_repo`（公共仓库）或 `repo`（私有仓库）
4. 复制生成的 Token

#### 3. 🗄️ 设置数据库

```bash
# 推送数据库模式
npm run prisma:push

# 生成 Prisma 客户端
npm run prisma:generate

# （可选）填充测试数据
npm run prisma:seed
```

#### 4. 🧪 验证安装

```bash
# 测试前端
npm run test

# 测试后端
npm run test:backend

# 启动开发服务器
npm run dev
```

## 🎮 使用指南

### 🌐 启动开发环境

```bash
# 启动前端开发服务器
npm run dev

# 在新终端中启动爬虫（可选）
cd backend
python -m scraper.main
```

访问 http://localhost:3000 查看应用。

### 🕷️ 运行爬虫

```bash
# 进入后端目录
cd backend

# 运行关键词爬虫
python -m scraper.keyword_scraper

# 运行数据分析
python -m scraper.analyzers.data_analysis

# 运行完整流程
python -m scraper.main

# 启动定时任务调度器
python -m scraper.scheduler
```

### 📊 查看分析结果

爬虫运行后，分析结果会保存在：
- `public/analytics/` - JSON 格式的分析数据
- 数据库中 - 结构化的仓库和关键词数据

在 Web 界面中查看：
- **Dashboard** - 总体趋势概览
- **Keywords** - 关键词管理和分析
- **Daily/Weekly/Monthly** - 不同时间维度的趋势

## 🔧 常见问题解决

### ❓ 安装问题

**问题：npm install 失败**
```bash
# 清理缓存重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**问题：Python 依赖安装失败**
```bash
# 使用虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

### ❓ 数据库问题

**问题：数据库连接失败**
1. 确认 PostgreSQL 服务已启动
2. 检查 `.env` 中的 `DATABASE_URL` 配置
3. 确认数据库用户权限

**问题：Prisma 同步失败**
```bash
# 重置数据库
npx prisma migrate reset
npx prisma db push
npx prisma generate
```

### ❓ GitHub API 问题

**问题：API 速率限制**
- 确保使用了有效的 GitHub Token
- 配置多个备用 Token
- 检查 Token 权限设置

**问题：Token 无效**
```bash
# 测试 Token 有效性
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

### ❓ 测试问题

**问题：前端测试失败**
```bash
# 更新测试快照
npm test -- --updateSnapshot

# 清理测试缓存
npm test -- --clearCache
```

**问题：后端测试失败**
```bash
# 重新安装测试依赖
cd scraper
pip install -r requirements-dev.txt

# 运行特定测试调试
python -m pytest tests/test_specific.py -v -s
```

## 🎯 下一步

设置完成后，你可以：

1. **🔍 探索代码**：查看 `components/` 和 `scraper/` 目录
2. **🧪 运行测试**：确保所有功能正常
3. **🕷️ 执行爬虫**：抓取最新的 GitHub 趋势数据
4. **📊 查看分析**：在 Web 界面中查看趋势分析
5. **🛠️ 自定义开发**：添加新的关键词或分析功能

## 📚 更多资源

- **架构文档**：`docs/ARCHITECTURE.md`
- **测试指南**：`docs/TESTING.md`
- **API 文档**：`docs/API.md`
- **部署指南**：`docs/DEPLOYMENT.md`

---

🎉 **恭喜！你已经成功设置了 GitHub Trending Scraper 项目！**

如果遇到任何问题，请查看故障排除部分或提交 Issue。
