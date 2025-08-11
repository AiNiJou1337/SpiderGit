# 🔄 项目架构迁移指南

本指南详细说明如何将现有的 GitHub Trending Scraper 项目迁移到新的架构结构。

## 📋 迁移概述

### 🎯 迁移目标
- 📁 **更清晰的文件组织**：按功能和类型分组
- 🧩 **模块化架构**：前后端分离，职责明确
- 🧪 **统一的测试结构**：集中管理测试文件
- 🛠️ **工具脚本整理**：按用途分类组织
- 📚 **文档集中管理**：统一文档入口

### ⚠️ 迁移前准备

1. **备份项目**：
   ```bash
   # 创建备份分支
   git checkout -b backup/before-restructure
   git push origin backup/before-restructure
   
   # 创建迁移分支
   git checkout -b feature/restructure
   ```

2. **确保环境清洁**：
   ```bash
   # 停止开发服务器
   # 清理临时文件
   npm run clean  # 如果有的话
   ```

## 🚀 自动化迁移

### 一键迁移脚本

```bash
# 运行自动化重构脚本
node tools/scripts/restructure-project.js
```

这个脚本会：
- ✅ 创建新的目录结构
- ✅ 移动文件到对应位置
- ✅ 更新配置文件路径
- ✅ 修改 package.json 脚本

### 迁移阶段说明

#### 📚 第一阶段：文档整理
```
ARCHITECTURE.md → docs/ARCHITECTURE.md
TESTING.md → docs/TESTING.md
QUICK_START.md → docs/QUICK_START.md
```

#### 🎨 第二阶段：前端重构
```
lib/ → src/lib/
components/ → src/components/
创建 src/types/ 目录
```

#### 🐍 第三阶段：后端重构
```
scraper/ → backend/
按模块重新组织 Python 代码
分离配置和依赖文件
```

#### 🧪 第四阶段：测试整合
```
__tests__/ → tests/frontend/
scraper/tests/ → tests/backend/
创建统一测试配置
```

#### 🔧 第五阶段：工具优化
```
scripts/ → tools/scripts/
按功能分类脚本文件
```

## 🔧 手动迁移步骤

如果需要手动迁移，请按以下步骤执行：

### 1. 创建新目录结构

```bash
mkdir -p docs
mkdir -p src/{lib/{db,api,utils},components/{ui,charts,features,layout},types}
mkdir -p backend/{scraper/{core,crawlers,analyzers,utils},analysis/{processors,generators},config,requirements}
mkdir -p tests/{frontend,backend/{unit,integration,fixtures}}
mkdir -p tools/scripts/{setup,testing,deployment,maintenance}
mkdir -p database/{backups,scripts}
mkdir -p config
```

### 2. 移动文档文件

```bash
mv ARCHITECTURE.md docs/
mv TESTING.md docs/
mv QUICK_START.md docs/
cp README.md docs/  # 保留根目录副本
```

### 3. 重构前端代码

```bash
# 移动 lib 文件
mv lib/db.ts src/lib/db/prisma.ts
mv lib/prisma.ts src/lib/db/client.ts
mv lib/python-resolver.ts src/lib/utils/python-resolver.ts
mv lib/utils.ts src/lib/utils/helpers.ts

# 移动组件文件
mv components/navbar.tsx src/components/layout/
mv components/language-trends-chart.tsx src/components/charts/
mv components/keyword-cloud.tsx src/components/features/
# ... 其他组件文件
```

### 4. 重构后端代码

```bash
# 创建后端目录
mv scraper backend/scraper-old
mkdir -p backend/scraper/{core,crawlers,analyzers,utils}

# 重新组织 Python 文件
mv backend/scraper-old/keyword_scraper.py backend/scraper/crawlers/keyword_crawler.py
mv backend/scraper-old/data_analysis.py backend/analysis/processors/data_processor.py
# ... 其他 Python 文件
```

### 5. 整合测试文件

```bash
mv __tests__ tests/frontend/
mv jest.setup.js tests/frontend/
mv backend/scraper-old/tests tests/backend/unit/
```

## 📝 配置文件更新

### 1. 更新 package.json

```json
{
  "scripts": {
    "test:backend": "cd backend && python -m pytest",
    "ci:check": "npm run lint && npm run type-check && npm run build && cd backend && flake8 . && black --check ."
  }
}
```

### 2. 更新 tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/lib/*": ["src/lib/*"],
      "@/types/*": ["src/types/*"]
    }
  }
}
```

### 3. 更新 Next.js 配置

```javascript
// config/next.config.js
const nextConfig = {
  // 更新路径配置
}
```

### 4. 更新测试配置

```javascript
// tests/frontend/jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../src/$1'
  }
}
```

## 🔄 Import 路径更新

### 前端 Import 更新

**旧路径：**
```typescript
import { prisma } from '@/lib/db'
import Navbar from '@/components/navbar'
```

**新路径：**
```typescript
import { prisma } from '@/lib/db/prisma'
import Navbar from '@/components/layout/navbar'
```

### 后端 Import 更新

**旧路径：**
```python
from keyword_scraper import GitHubTokenManager
from data_analysis import analyze_data
```

**新路径：**
```python
from backend.scraper.crawlers.keyword_crawler import GitHubTokenManager
from backend.analysis.processors.data_processor import analyze_data
```

## 🧪 迁移后验证

### 1. 前端验证

```bash
# 安装依赖
npm install

# 类型检查
npm run type-check

# 构建测试
npm run build

# 运行测试
npm run test:frontend
```

### 2. 后端验证

```bash
# 安装 Python 依赖
cd backend
pip install -r requirements/dev.txt

# 语法检查
flake8 .

# 运行测试
python -m pytest
```

### 3. 集成验证

```bash
# 运行完整测试套件
npm run test:all

# CI 检查
npm run ci:check
```

## 🔧 常见问题解决

### 问题 1: Import 路径错误

**症状**: TypeScript 或 Python 找不到模块

**解决**: 
- 检查 tsconfig.json 的 paths 配置
- 更新所有 import 语句
- 确保 __init__.py 文件存在（Python）

### 问题 2: 测试文件找不到

**症状**: Jest 或 pytest 找不到测试文件

**解决**:
- 更新测试配置文件路径
- 检查 testPathIgnorePatterns 设置
- 验证测试文件命名规范

### 问题 3: 静态资源路径错误

**症状**: 图片或其他静态资源加载失败

**解决**:
- 检查 public/ 目录结构
- 更新资源引用路径
- 验证 Next.js 静态资源配置

## 📋 迁移检查清单

### 迁移前
- [ ] 创建备份分支
- [ ] 停止开发服务器
- [ ] 清理临时文件
- [ ] 记录当前配置

### 迁移中
- [ ] 执行自动化脚本或手动迁移
- [ ] 更新配置文件
- [ ] 修改 import 路径
- [ ] 更新文档引用

### 迁移后
- [ ] 前端构建成功
- [ ] 后端测试通过
- [ ] 所有测试运行正常
- [ ] CI/CD 流程正常
- [ ] 文档链接正确
- [ ] 提交更改到 Git

## 🎉 迁移完成

迁移完成后，你将拥有：

- 📁 **清晰的项目结构**：文件按功能和类型组织
- 🧩 **模块化代码**：前后端职责分离
- 🧪 **统一测试**：集中的测试管理
- 📚 **完整文档**：集中的文档系统
- 🛠️ **有序工具**：分类的脚本和工具

恭喜！你的项目现在拥有了更专业、更易维护的架构结构。
