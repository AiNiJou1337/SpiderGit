# 用户使用指南

<div align="center">
  <img src="../public/logo.png" alt="GitHub趋势爬虫" width="120" height="120" />
  <h1>GitHub趋势爬虫与分析平台 - 使用指南</h1>
  <p><strong>详细的功能使用说明和操作指南</strong></p>
</div>

## 🚀 快速开始

### 📋 前置要求
- Node.js 18+ 
- Python 3.8+
- GitHub Personal Access Token

### ⚡ 一键启动
```bash
# 1. 克隆项目
git clone https://github.com/AiNiJou1337/SpiderGit.git
cd SpiderGit

# 2. 安装依赖
npm install

# 3. 启动应用
npm run dev

# 4. 访问应用
# 打开浏览器访问 http://localhost:3000
```

## 🏠 首页功能

### 项目介绍
- **功能概览**: 查看平台的核心功能特性
- **技术架构**: 了解系统的技术实现
- **实时统计**: 查看平台收集的数据概况
- **快速导航**: 直接跳转到Dashboard或Trends页面

### 主要特性展示
- 🔥 **热门仓库Dashboard**: 实时展示月度热门项目
- 📊 **技术栈统计**: 编程语言分布和趋势分析
- 📈 **时间序列分析**: 历史数据追踪和趋势预测
- 🗓️ **日历热力图**: 每日趋势活动可视化

## 📊 Dashboard 使用指南

### 访问方式
- 直接访问: http://localhost:3000/dashboard
- 从首页点击"查看Dashboard"按钮

### 主要功能

#### 1. 热门仓库展示
- **数据来源**: GitHub月度热门项目
- **排序方式**: 按今日星标增长数排序
- **显示信息**:
  - 项目名称和描述
  - 编程语言
  - 星标数和今日新增
  - Fork数
  - 项目链接

#### 2. 技术栈概览
- **语言分布**: 饼图展示各编程语言占比
- **统计信息**: 
  - 总项目数量
  - 涵盖语言种类
  - 各语言项目数量和百分比
- **趋势指示**: 显示语言的流行趋势

#### 3. 数据刷新
- **手动刷新**: 点击刷新按钮获取最新数据
- **自动更新**: 页面会定期检查数据更新
- **加载状态**: 显示数据加载进度

## 📈 Trends 分析页面

### 访问方式
- 直接访问: http://localhost:3000/trends
- 从首页点击"浏览趋势"按钮

### 核心功能

#### 1. 多时间维度分析
- **日度趋势**: 查看每日热门项目
- **周度趋势**: 查看每周热门项目  
- **月度趋势**: 查看每月热门项目
- **切换方式**: 点击标签页切换不同时间维度

#### 2. 分页浏览
- **数据量**: 每个时间维度最多300个项目
- **分页大小**: 每页显示20个项目
- **导航控制**: 
  - 上一页/下一页按钮
  - 页码直接跳转
  - 总页数显示

#### 3. 高级筛选
- **编程语言**: 按语言筛选项目
- **排序方式**: 
  - 按星标数排序
  - 按Fork数排序
  - 按更新时间排序
- **搜索功能**: 按项目名称搜索

#### 4. 日历热力图
- **功能**: 显示每日GitHub趋势活动
- **颜色深度**: 表示当日热门项目数量
- **交互**: 点击日期查看当日详细数据
- **时间范围**: 显示最近30天的数据

#### 5. 时间序列分析
- **趋势图表**: 显示项目星标增长趋势
- **对比分析**: 多个项目的趋势对比
- **数据点**: 每个数据点显示具体数值
- **时间范围**: 可调整显示的时间范围

## 🔧 数据管理

### 数据采集
```bash
# 进入后端目录
cd backend

# 采集最新趋势数据
python scraper/trending_manager.py

# 收集时间序列数据
python scraper/time_series_trending_manager.py
```

### 数据文件位置
- **主数据**: `public/trends/data/trends.json`
- **时间序列**: `public/trends/time_series/`
- **备份数据**: `public/trends/backups/`

### 数据格式
```json
{
  "daily": [...],     // 日度热门仓库
  "weekly": [...],    // 周度热门仓库  
  "monthly": [...],   // 月度热门仓库
  "lastUpdated": "2025-08-26T12:56:03.126447"
}
```

## 🛠️ 高级配置

### GitHub Token 配置
```bash
# 创建 .env 文件
GITHUB_TOKEN_GMAIL=your_github_token_here
GITHUB_TOKEN_QQ=your_second_token_here
```

### 定时任务设置
```bash
# 启动定时任务
cd backend
python scraper/scheduler.py

# 自定义调度频率
# 编辑 scheduler.py 文件中的调度设置
```

### API 端点
- **主趋势API**: `/api/trends?period=monthly&limit=6`
- **技术栈统计**: `/api/trends/stats?period=monthly`
- **日历数据**: `/api/trending/calendar?year=2025&month=8`
- **时间序列**: `/api/trending/time-series?period=daily&limit=30`

## 🎨 界面自定义

### 主题设置
- 系统会自动适配系统的明暗主题
- 支持手动切换主题模式
- 毛玻璃效果和渐变背景

### 响应式设计
- **桌面端**: 完整功能展示
- **平板端**: 自适应布局
- **移动端**: 优化的移动体验

## 🔍 故障排除

### 常见问题

#### 1. 数据不显示
- 检查数据文件是否存在
- 确认API服务是否正常
- 查看浏览器控制台错误信息

#### 2. GitHub Token 问题
- 确认Token是否有效
- 检查Token权限设置
- 验证环境变量配置

#### 3. 爬虫无法运行
- 检查Python依赖是否安装
- 确认网络连接正常
- 查看爬虫日志文件

### 日志查看
```bash
# 查看爬虫日志
tail -f backend/scraper.log

# 查看调度器日志  
tail -f backend/scheduler.log
```

## 📞 技术支持

### 获取帮助
- **GitHub Issues**: 提交问题和建议
- **文档**: 查看详细的技术文档
- **示例**: 参考项目中的示例代码

### 贡献指南
- Fork项目仓库
- 创建功能分支
- 提交Pull Request
- 参与代码审查

---

<div align="center">
  <p>🎉 感谢使用GitHub趋势爬虫与分析平台！</p>
  <p>如有问题，请查看文档或提交Issue</p>
</div>
