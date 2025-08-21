# 项目结构说明

## 📁 核心目录结构

```
spiderGit/
├── 📱 前端部分
│   ├── app/                    # Next.js 13+ App Router
│   ├── src/                    # 源代码
│   │   ├── components/         # React 组件
│   │   ├── lib/               # 工具库
│   │   └── types/             # TypeScript 类型定义
│   └── public/                # 静态资源
│       ├── analytics/         # 分析结果数据
│       └── img/              # 图片资源
│
├── 🐍 后端部分
│   └── backend/
│       ├── scraper/           # 爬虫核心代码
│       │   ├── analyzers/     # 数据分析器
│       │   ├── core/          # 核心功能
│       │   └── crawlers/      # 爬虫实现
│       └── requirements/      # Python 依赖
│
├── 🗄️ 数据库
│   └── database/
│       └── prisma/           # Prisma ORM 配置
│
├── 📚 文档
│   └── docs/
│       ├── API.md            # API 文档
│       ├── ARCHITECTURE.md   # 架构文档
│       ├── DEPLOYMENT.md     # 部署文档
│       └── QUICK_START.md    # 快速开始
│
├── 🧪 测试
│   ├── __tests__/            # Jest 测试
│   └── tests/               # 其他测试
│
└── 🛠️ 工具和配置
    ├── tools/               # 工具脚本
    ├── config/             # 配置文件
    └── 各种配置文件 (.json, .js, .ts, .md)
```

## 🗑️ 已清理的临时文件

### 一次性修复脚本
- ❌ `fix_missing_tags.py` - 修复标签数据脚本
- ❌ `reanalyze_keywords.py` - 重新分析脚本
- ❌ `simple_reanalyze.py` - 简化分析脚本
- ❌ `test_analysis_fix.py` - 测试修复脚本

### 临时文档和日志
- ❌ `问题修复报告.md` - 临时修复报告
- ❌ `data_analysis.log` - 分析日志
- ❌ `backend/FIX_SUMMARY.md` - 后端修复总结
- ❌ `backend/test_fix.py` - 后端测试脚本

### 参考代码和临时目录
- ❌ `cankao/` - 参考代码目录
- ❌ `tmp/` - 临时目录
- ❌ `cleanup-maimai.js` - 清理脚本

## 🛡️ .gitignore 更新

添加了以下忽略规则，防止临时文件被提交：

```gitignore
# Temporary files and scripts
*_fix.py
*_test.py
fix_*.py
test_*.py
reanalyze_*.py
simple_*.py
cleanup_*.py
cleanup-*.js
*修复报告.md
*.log
temp_*.json
temp_*.py
```

## 📋 项目清理总结

✅ **已完成**：
- 删除了所有一次性修复脚本
- 清理了临时文档和日志文件
- 移除了参考代码目录
- 更新了 .gitignore 规则
- 保持了核心功能代码的完整性

✅ **保留的重要文件**：
- 所有核心业务代码
- 配置文件和依赖管理
- 文档和测试文件
- 分析结果数据

🎯 **结果**：项目结构现在更加整洁和专业，便于维护和部署。
