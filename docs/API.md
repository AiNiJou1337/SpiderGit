# 🔌 GitHub趋势爬虫平台 - API 文档

<div align="center">
  <img src="../public/logo.png" alt="GitHub趋势爬虫" width="120" height="120" />
  <h1>API 文档</h1>
  <p><strong>完整的API接口说明和使用指南</strong></p>
</div>

## 📋 概述

本文档详细描述了GitHub趋势爬虫平台的API接口，包括趋势数据、统计分析、时间序列等核心功能的API使用方法。

## 🌐 基础信息

- **基础URL**: `http://localhost:3000/api`
- **数据格式**: JSON
- **认证方式**: 无需认证（本地开发）
- **版本**: v2.0
- **字符编码**: UTF-8
- **HTTP方法**: GET, POST
- **响应格式**: 统一的JSON响应格式

## 📊 核心API接口

### 1. 趋势数据API

#### GET /api/trends

获取GitHub趋势数据，支持多时间维度查询。

**请求参数**:
- `period` (string): 时间周期，可选值：`daily`, `weekly`, `monthly`
- `limit` (number): 返回数量限制，默认300
- `language` (string): 编程语言过滤，默认`all`

**请求示例**:
```bash
GET /api/trends?period=monthly&limit=6&language=all
```

**响应格式**:
```json
{
  "success": true,
  "data": [
    {
      "id": 748207,
      "name": "Archon",
      "full_name": "coleam00/Archon",
      "description": "项目描述",
      "html_url": "https://github.com/coleam00/Archon",
      "language": "TypeScript",
      "stargazers_count": 10768,
      "forks_count": 1853,
      "today_stars": 5547,
      "owner": {
        "login": "coleam00",
        "avatar_url": "https://github.com/coleam00.png"
      },
      "created_at": "2025-08-26T12:54:58.770335",
      "scraped_at": "2025-08-26T12:54:58.770335"
    }
  ],
  "metadata": {
    "period": "monthly",
    "total": 6,
    "lastUpdated": "2025-08-26T12:56:03.126447"
  }
}
```

### 2. 技术栈统计API

#### GET /api/trends/stats

获取编程语言分布和技术栈统计数据。

**请求参数**:
- `period` (string): 时间周期，默认`monthly`

**请求示例**:
```bash
GET /api/trends/stats?period=monthly
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "languageDistribution": [
      {
        "language": "TypeScript",
        "count": 120,
        "percentage": 26
      },
      {
        "language": "Python",
        "count": 89,
        "percentage": 20
      }
    ],
    "totalRepositories": 454,
    "totalLanguages": 26
  }
}
    "TypeScript": 250,
    "Java": 200,
    "Go": 150
  },
  "lastUpdated": "2024-08-21T10:30:00Z"
}
```

## 🔍 关键词管理 API

### GET /api/keywords

获取所有关键词列表。

**查询参数**:
- `page` (可选): 页码，默认为 1
- `limit` (可选): 每页数量，默认为 20
- `search` (可选): 搜索关键词

**响应示例**:
```json
{
  "keywords": [
    {
      "id": "1",
      "name": "react",
      "count": 150,
      "trend": "up",
      "lastAnalyzed": "2024-08-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

### POST /api/keywords

创建新的关键词分析任务。

**请求体**:
```json
{
  "keyword": "machine learning",
  "language": "python",
  "maxRepos": 100
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": "task_123456",
  "message": "关键词分析任务已启动",
  "estimatedTime": "5-10分钟"
}
```

### GET /api/keywords/[id]

获取特定关键词的详细信息。

**路径参数**:
- `id`: 关键词ID

**响应示例**:
```json
{
  "keyword": {
    "id": "1",
    "name": "react",
    "count": 150,
    "trend": "up",
    "repositories": [
      {
        "id": "1",
        "name": "facebook/react",
        "description": "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
        "stars": 220000,
        "language": "JavaScript"
      }
    ]
  },
  "trendData": [
    {
      "date": "2024-08-20",
      "count": 145
    },
    {
      "date": "2024-08-21",
      "count": 150
    }
  ],
  "languageDistribution": {
    "JavaScript": 80,
    "TypeScript": 45,
    "Python": 25
  }
}
```

## 📈 趋势数据 API

### GET /api/trending

获取趋势数据。

**查询参数**:
- `period`: 时间周期 (`daily`, `weekly`, `monthly`)
- `language` (可选): 编程语言过滤
- `limit` (可选): 返回数量限制

**响应示例**:
```json
{
  "period": "daily",
  "data": [
    {
      "date": "2024-08-21",
      "repositories": [
        {
          "name": "microsoft/vscode",
          "stars": 158000,
          "todayStars": 120,
          "language": "TypeScript"
        }
      ]
    }
  ]
}
```

## 🗂️ 仓库数据 API

### GET /api/repositories

查询仓库数据。

**查询参数**:
- `keyword` (可选): 关键词过滤
- `language` (可选): 编程语言过滤
- `minStars` (可选): 最小星标数
- `page` (可选): 页码
- `limit` (可选): 每页数量

**响应示例**:
```json
{
  "repositories": [
    {
      "id": "1",
      "name": "facebook/react",
      "fullName": "facebook/react",
      "description": "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
      "stars": 220000,
      "forks": 45000,
      "language": "JavaScript",
      "topics": ["javascript", "react", "frontend"],
      "createdAt": "2013-05-24T16:15:54Z",
      "updatedAt": "2024-08-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "totalPages": 63
  }
}
```

## 📚 库分析 API

### GET /api/libraries

获取库使用分析数据。

**查询参数**:
- `language` (可选): 编程语言过滤
- `keyword` (可选): 关键词过滤
- `limit` (可选): 返回数量限制

**响应示例**:
```json
{
  "libraries": [
    {
      "name": "react",
      "count": 450,
      "percentage": 36.0,
      "language": "JavaScript",
      "category": "frontend"
    },
    {
      "name": "express",
      "count": 320,
      "percentage": 25.6,
      "language": "JavaScript",
      "category": "backend"
    }
  ],
  "totalProjects": 1250,
  "analysisDate": "2024-08-21T10:00:00Z"
}
```

## 🕷️ 爬虫控制 API

### POST /api/crawl

启动爬虫任务。

**请求体**:
```json
{
  "type": "keyword",
  "keyword": "artificial intelligence",
  "language": "python",
  "maxRepos": 200,
  "options": {
    "includeAnalysis": true,
    "updateExisting": false
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": "crawl_789012",
  "status": "started",
  "message": "爬虫任务已启动",
  "estimatedTime": "10-15分钟"
}
```

### GET /api/crawl/status/[taskId]

查询爬虫任务状态。

**响应示例**:
```json
{
  "taskId": "crawl_789012",
  "status": "running",
  "progress": 65,
  "processedRepos": 130,
  "totalRepos": 200,
  "startTime": "2024-08-21T10:00:00Z",
  "estimatedCompletion": "2024-08-21T10:12:00Z"
}
```

## 📤 数据导出 API

### GET /api/export

导出分析数据。

**查询参数**:
- `format`: 导出格式 (`json`, `csv`, `xlsx`)
- `type`: 数据类型 (`repositories`, `keywords`, `libraries`, `trends`)
- `keyword` (可选): 关键词过滤

**响应**: 文件下载或JSON数据

## ❌ 错误处理

### 错误响应格式

```json
{
  "error": true,
  "code": "INVALID_PARAMETER",
  "message": "参数 'keyword' 不能为空",
  "details": {
    "field": "keyword",
    "value": "",
    "expected": "非空字符串"
  },
  "timestamp": "2024-08-21T10:00:00Z"
}
```

### 常见错误码

- `400 BAD_REQUEST`: 请求参数错误
- `401 UNAUTHORIZED`: 未授权访问
- `404 NOT_FOUND`: 资源不存在
- `429 RATE_LIMITED`: 请求频率过高
- `500 INTERNAL_ERROR`: 服务器内部错误
- `503 SERVICE_UNAVAILABLE`: 服务暂不可用

## 🔒 安全说明

- API 目前不需要认证，但建议在生产环境中添加认证机制
- 请求频率限制：每分钟最多 60 次请求
- 大量数据请求建议使用分页参数
- 敏感操作（如启动爬虫）建议添加权限验证

## 📝 更新日志

- **v1.0.0** (2024-08-21): 初始版本，包含基础 API 功能
- 后续版本将添加认证、WebSocket 实时更新等功能
