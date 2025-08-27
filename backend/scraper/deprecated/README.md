# 废弃文件说明

本文件夹包含已被替换或不再使用的爬虫代码文件。这些文件被移动到此处以保持代码历史，但不再是项目的活跃部分。

## 废弃文件列表

### 1. `keyword_scraper.py` (旧版本)
- **废弃原因**: 被 `crawlers/keyword_scraper.py` 替代
- **主要问题**: 
  - 直接连接数据库，违反了架构分层原则
  - 代码结构混乱，缺乏模块化
  - 硬编码的数据库连接信息
- **替代方案**: 使用 `backend/scraper/crawlers/keyword_scraper.py`

### 2. `trending_crawler.py` (API版本)
- **废弃原因**: 被 `crawlers/github_trending_html.py` 替代
- **主要问题**:
  - 依赖GitHub API，受到严格的速率限制
  - 无法获取真正的"今日增长"数据
  - API返回的数据与GitHub Trending页面不一致
- **替代方案**: 使用 `backend/scraper/crawlers/github_trending_html.py`

### 3. `trending_scheduler.py`
- **废弃原因**: 与 `scheduler.py` 功能重复
- **主要问题**:
  - 功能与主调度器重叠
  - 维护两个调度器增加了复杂性
- **替代方案**: 使用 `backend/scraper/scheduler.py`

### 4. `test_enhanced_crawler.py`
- **废弃原因**: 测试已废弃的 `trending_crawler.py`
- **主要问题**:
  - 测试目标已被移除
  - 测试逻辑过时
- **替代方案**: 为新的HTML爬虫编写新的测试

### 5. `mock_data_generator.py`
- **废弃原因**: 模拟数据生成器不再需要
- **主要问题**:
  - 直接操作数据库
  - 生成的模拟数据与实际数据结构不匹配
- **替代方案**: 如需测试数据，使用实际的HTML爬虫获取

## 当前活跃的爬虫架构

```
backend/scraper/
├── core/                           # 核心组件
│   ├── api_client.py              # GitHub API 客户端
│   └── token_manager.py           # Token 管理
├── crawlers/                       # 爬虫实现
│   ├── github_trending_html.py    # HTML趋势爬虫 (主要)
│   └── keyword_scraper.py         # 关键词爬虫 (重构版)
├── analyzers/                      # 数据分析器
│   ├── code_analyzer.py           # 代码分析
│   └── data_analysis.py           # 数据统计
├── main.py                        # 主程序入口
├── scheduler.py                   # 定时任务调度
├── trending_manager.py            # 趋势数据管理
└── time_series_trending_manager.py # 时间序列管理
```

## 迁移说明

如果需要恢复某个废弃文件的功能，请：

1. **不要直接使用废弃文件** - 它们可能包含过时的依赖和架构
2. **参考废弃文件的逻辑** - 提取有用的业务逻辑
3. **使用当前架构重新实现** - 遵循现有的模块化设计
4. **编写相应的测试** - 确保新实现的正确性

## 清理计划

这些文件将在以下情况下被永久删除：
- 确认新架构稳定运行超过3个月
- 所有相关功能已在新架构中实现并测试通过
- 团队确认不再需要参考这些文件

---

*最后更新: 2025-08-26*
*移动原因: 架构重构，消除重复代码*
