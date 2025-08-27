## 📡 API 接口

### 趋势数据 API
```http
GET /api/trends?period=monthly&limit=6&language=all
```
**参数说明:**
- `period`: 时间周期 (daily/weekly/monthly)
- `limit`: 返回数量限制
- `language`: 编程语言过滤 (all/javascript/python等)

**响应格式:**
```json
{
  "success": true,
  "data": [
    {
      "name": "项目名称",
      "full_name": "owner/repo",
      "description": "项目描述",
      "language": "编程语言",
      "stargazers_count": 12345,
      "today_stars": 678,
      "html_url": "GitHub链接"
    }
  ],
  "metadata": {
    "period": "monthly",
    "total": 6,
    "lastUpdated": "2025-08-26T12:56:03.126447"
  }
}
```

### 技术栈统计 API
```http
GET /api/trends/stats?period=monthly
```
**响应格式:**
```json
{
  "success": true,
  "data": {
    "languageDistribution": [
      {
        "language": "TypeScript",
        "count": 120,
        "percentage": 26
      }
    ],
    "totalRepositories": 454,
    "totalLanguages": 26
  }
}
```

## 📁 数据结构

### 数据文件组织
```
public/trends/
├── data/
│   └── trends.json          # 主趋势数据文件
└── time_series/
    ├── daily_trends.json    # 日度时间序列数据
    ├── weekly_trends.json   # 周度时间序列数据
    └── monthly_trends.json  # 月度时间序列数据
```

### 主数据文件结构 (trends.json)
```json
{
  "daily": [...],     # 日度热门仓库列表
  "weekly": [...],    # 周度热门仓库列表
  "monthly": [...],   # 月度热门仓库列表
  "lastUpdated": "2025-08-26T12:56:03.126447"
}
```

### 仓库数据结构
```json
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
```
