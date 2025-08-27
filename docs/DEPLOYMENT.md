# 🚀 GitHub趋势爬虫平台 - 部署指南

<div align="center">
  <img src="../public/logo.png" alt="GitHub趋势爬虫" width="120" height="120" />
  <h1>部署指南</h1>
  <p><strong>完整的部署方案和配置说明</strong></p>
</div>

## 📋 概述

本文档详细介绍GitHub趋势爬虫平台的部署方案，包括本地开发、生产环境和云平台部署的完整步骤。

## 🛠️ 环境要求

### 基础要求
- **Node.js**: 18.0+ (推荐 20+)
- **Python**: 3.8+ (推荐 3.9+)
- **Git**: 2.30+
- **GitHub Token**: Personal Access Token

### 推荐配置
- **CPU**: 2核心以上
- **内存**: 4GB 以上
- **存储**: 10GB 以上可用空间
- **网络**: 稳定的互联网连接

### 轻量级特性
- ✅ **无数据库依赖**: 使用JSON文件存储
- ✅ **轻量部署**: 无需复杂的数据库配置
- ✅ **快速启动**: 几分钟内完成部署

## 🏠 本地开发环境

### 1. 克隆项目

```bash
git clone https://github.com/AiNiJou1337/SpiderGit.git
cd SpiderGit
```

### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装Python依赖
cd backend
pip install -r requirements/base.txt
cd ..
```

### 3. 环境配置

```bash
# 创建环境变量文件
cp .env.example .env

# 编辑 .env 文件，添加GitHub Token
# GITHUB_TOKEN_GMAIL=your_github_token_here
# GITHUB_TOKEN_QQ=your_second_token_here
```

### 4. 启动应用

```bash
# 启动前端开发服务器
npm run dev

# 访问应用
# 首页: http://localhost:3000
# Dashboard: http://localhost:3000/dashboard
# Trends: http://localhost:3000/trends
```

### 5. 数据采集（可选）

```bash
# 进入后端目录
cd backend

# 采集GitHub趋势数据
python scraper/trending_manager.py

# 收集时间序列数据
python scraper/time_series_trending_manager.py
```

### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
pip install -r backend/requirements/base.txt
pip install -r backend/requirements/dev.txt
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

必需的环境变量：
```env
# 数据库连接
DATABASE_URL="postgresql://username:password@localhost:5432/github_trending"

# GitHub API Token (可选，提高请求限制)
GITHUB_TOKEN_MAIN="your_github_token_here"
GITHUB_TOKEN_BACKUP1="backup_token_1"
GITHUB_TOKEN_BACKUP2="backup_token_2"

# 应用配置
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. 初始化数据库

```bash
# 创建数据库
createdb github_trending

# 运行数据库迁移
npm run prisma:push

# 生成 Prisma 客户端
npm run prisma:generate

# 填充种子数据（可选）
npm run prisma:seed
```

### 5. 启动开发服务器

```bash
# 启动前端开发服务器
npm run dev

# 在新终端中运行爬虫（可选）
cd backend
python -m scraper.main
```

访问 http://localhost:3000 查看应用。

## 🧪 测试环境部署

### 使用 Docker Compose

1. **创建 docker-compose.yml**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/github_trending
    depends_on:
      - db
    volumes:
      - ./public/analytics:/app/public/analytics

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=github_trending
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  scraper:
    build:
      context: .
      dockerfile: Dockerfile.scraper
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/github_trending
    depends_on:
      - db
    volumes:
      - ./public/analytics:/app/public/analytics

volumes:
  postgres_data:
```

2. **创建 Dockerfile**

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

3. **启动服务**

```bash
# 构建并启动所有服务
docker-compose up --build -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## ☁️ 生产环境部署

### Vercel 部署（推荐）

1. **准备部署**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login
```

2. **配置 vercel.json**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "DATABASE_URL": "@database-url",
    "GITHUB_TOKEN_MAIN": "@github-token-main"
  }
}
```

3. **部署应用**

```bash
# 部署到 Vercel
vercel --prod

# 设置环境变量
vercel env add DATABASE_URL
vercel env add GITHUB_TOKEN_MAIN
```

### AWS 部署

1. **使用 AWS Amplify**

```bash
# 安装 Amplify CLI
npm install -g @aws-amplify/cli

# 初始化 Amplify
amplify init

# 添加托管
amplify add hosting

# 部署
amplify publish
```

2. **使用 AWS ECS**

创建 `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    image: your-registry/github-trending-scraper:latest
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - GITHUB_TOKEN_MAIN=${GITHUB_TOKEN_MAIN}
    logging:
      driver: awslogs
      options:
        awslogs-group: /ecs/github-trending-scraper
        awslogs-region: us-east-1
        awslogs-stream-prefix: ecs
```

### 数据库部署

#### AWS RDS

```bash
# 创建 RDS 实例
aws rds create-db-instance \
  --db-instance-identifier github-trending-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password your-password \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxx
```

#### Google Cloud SQL

```bash
# 创建 Cloud SQL 实例
gcloud sql instances create github-trending-db \
  --database-version=POSTGRES_13 \
  --tier=db-f1-micro \
  --region=us-central1
```

## 🔧 部署后配置

### 1. 数据库迁移

```bash
# 在生产环境运行迁移
DATABASE_URL="your-production-db-url" npm run prisma:migrate deploy
```

### 2. 设置定时任务

创建 `crontab` 任务：

```bash
# 编辑 crontab
crontab -e

# 添加定时任务
# 每天凌晨 2 点运行爬虫
0 2 * * * cd /path/to/project && python -m backend.scraper.scheduler

# 每周日凌晨 3 点清理旧数据
0 3 * * 0 cd /path/to/project && python -m backend.scraper.cleanup
```

### 3. 配置监控

#### 使用 PM2 (Node.js)

```bash
# 安装 PM2
npm install -g pm2

# 创建 ecosystem.config.js
module.exports = {
  apps: [{
    name: 'github-trending-scraper',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G'
  }]
}

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 使用 Supervisor (Python)

```ini
[program:github-scraper]
command=/path/to/venv/bin/python -m backend.scraper.scheduler
directory=/path/to/project
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/github-scraper.log
```

## 🔍 健康检查

### 应用健康检查

创建 `app/api/health/route.ts`:

```typescript
export async function GET() {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    })
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 })
  }
}
```

### 监控脚本

```bash
#!/bin/bash
# health-check.sh

URL="https://your-domain.com/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Application is healthy"
    exit 0
else
    echo "Application is unhealthy (HTTP $RESPONSE)"
    exit 1
fi
```

## 🔒 安全配置

### 1. 环境变量安全

```bash
# 使用 AWS Secrets Manager
aws secretsmanager create-secret \
  --name github-trending-scraper/database \
  --secret-string '{"url":"postgresql://..."}'

# 使用 HashiCorp Vault
vault kv put secret/github-trending-scraper \
  database_url="postgresql://..." \
  github_token="ghp_..."
```

### 2. 网络安全

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
```

## 📊 性能优化

### 1. 缓存配置

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/stats',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600'
          }
        ]
      }
    ]
  }
}
```

### 2. CDN 配置

```bash
# CloudFlare 配置
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/cache_level" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"value":"aggressive"}'
```

## 🔄 CI/CD 配置

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 📝 部署检查清单

### 部署前检查
- [ ] 环境变量配置完成
- [ ] 数据库连接测试通过
- [ ] 依赖安装完成
- [ ] 构建测试通过
- [ ] 单元测试通过

### 部署后检查
- [ ] 应用启动成功
- [ ] 健康检查通过
- [ ] 数据库迁移完成
- [ ] 静态资源加载正常
- [ ] API 接口响应正常
- [ ] 爬虫任务运行正常
- [ ] 监控和日志配置完成

### 回滚计划
- [ ] 数据库备份完成
- [ ] 代码版本标记
- [ ] 回滚脚本准备
- [ ] 回滚测试验证

## 🆘 故障排除

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查数据库状态
   pg_isready -h localhost -p 5432
   
   # 检查连接字符串
   echo $DATABASE_URL
   ```

2. **构建失败**
   ```bash
   # 清理缓存
   npm run clean
   rm -rf .next node_modules
   npm install
   npm run build
   ```

3. **爬虫任务失败**
   ```bash
   # 检查 GitHub Token
   curl -H "Authorization: token $GITHUB_TOKEN_MAIN" \
        https://api.github.com/rate_limit
   ```

### 日志查看

```bash
# 应用日志
tail -f /var/log/github-trending-scraper.log

# 数据库日志
tail -f /var/log/postgresql/postgresql-13-main.log

# 系统日志
journalctl -u github-trending-scraper -f
```

---

📞 **需要帮助？** 请查看 [故障排除文档](./TROUBLESHOOTING.md) 或在 GitHub Issues 中提问。
