#!/usr/bin/env node
/**
 * 项目架构重构脚本
 * 自动重组项目文件结构，提升代码组织性
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 颜色输出
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
}

console.log(colors.bold('🏗️  GitHub Trending Scraper - 项目架构重构'))
console.log('=' .repeat(60))

// 工具函数
function createDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`${colors.green('✅')} 创建目录: ${colors.cyan(dirPath)}`)
    return true
  }
  return false
}

function moveFile(from, to) {
  try {
    if (fs.existsSync(from)) {
      const toDir = path.dirname(to)
      createDir(toDir)
      fs.renameSync(from, to)
      console.log(`${colors.green('📁')} 移动: ${colors.yellow(from)} → ${colors.cyan(to)}`)
      return true
    }
  } catch (error) {
    console.log(`${colors.red('❌')} 移动失败: ${from} → ${to} (${error.message})`)
  }
  return false
}

function copyFile(from, to) {
  try {
    if (fs.existsSync(from)) {
      const toDir = path.dirname(to)
      createDir(toDir)
      fs.copyFileSync(from, to)
      console.log(`${colors.green('📄')} 复制: ${colors.yellow(from)} → ${colors.cyan(to)}`)
      return true
    }
  } catch (error) {
    console.log(`${colors.red('❌')} 复制失败: ${from} → ${to} (${error.message})`)
  }
  return false
}

function updatePackageJson() {
  const packagePath = 'package.json'
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    
    // 更新脚本路径
    const scripts = packageJson.scripts || {}
    
    // 更新测试脚本路径
    if (scripts['test:backend']) {
      scripts['test:backend'] = 'cd backend && python -m pytest'
    }
    
    // 更新 CI 检查脚本
    if (scripts['ci:check']) {
      scripts['ci:check'] = 'npm run lint && npm run type-check && npm run build && cd backend && flake8 . && black --check .'
    }
    
    packageJson.scripts = scripts
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2))
    console.log(`${colors.green('📝')} 更新: package.json`)
  }
}

function updateGitignore() {
  const gitignorePath = '.gitignore'
  if (fs.existsSync(gitignorePath)) {
    let content = fs.readFileSync(gitignorePath, 'utf8')
    
    // 添加新的忽略规则
    const newRules = [
      '',
      '# 重构后的目录结构',
      'backend/__pycache__/',
      'backend/**/__pycache__/',
      'tests/frontend/coverage/',
      'tests/backend/htmlcov/',
      'tools/temp/',
      'database/backups/*.sql',
    ]
    
    newRules.forEach(rule => {
      if (!content.includes(rule.trim())) {
        content += '\n' + rule
      }
    })
    
    fs.writeFileSync(gitignorePath, content)
    console.log(`${colors.green('📝')} 更新: .gitignore`)
  }
}

// 重构计划
const restructurePlan = {
  // 第一阶段：文档整理
  phase1: {
    name: '📚 文档整理',
    actions: [
      () => createDir('docs'),
      () => moveFile('ARCHITECTURE.md', 'docs/ARCHITECTURE.md'),
      () => moveFile('TESTING.md', 'docs/TESTING.md'),
      () => moveFile('QUICK_START.md', 'docs/QUICK_START.md'),
      () => copyFile('README.md', 'docs/README.md'), // 保留根目录的 README
    ]
  },
  
  // 第二阶段：前端重构
  phase2: {
    name: '🎨 前端重构',
    actions: [
      () => createDir('src'),
      () => createDir('src/types'),
      () => createDir('src/lib/db'),
      () => createDir('src/lib/api'),
      () => createDir('src/lib/utils'),
      () => createDir('src/components/ui'),
      () => createDir('src/components/charts'),
      () => createDir('src/components/features'),
      () => createDir('src/components/layout'),
      
      // 移动 lib 文件
      () => moveFile('lib/db.ts', 'src/lib/db/prisma.ts'),
      () => moveFile('lib/prisma.ts', 'src/lib/db/client.ts'),
      () => moveFile('lib/python-resolver.ts', 'src/lib/utils/python-resolver.ts'),
      () => moveFile('lib/utils.ts', 'src/lib/utils/helpers.ts'),
      
      // 移动组件文件
      () => moveFile('components/navbar.tsx', 'src/components/layout/navbar.tsx'),
      () => moveFile('components/trends-navbar.tsx', 'src/components/layout/trends-navbar.tsx'),
      () => moveFile('components/language-trends-chart.tsx', 'src/components/charts/language-trends-chart.tsx'),
      () => moveFile('components/charts-display.tsx', 'src/components/charts/charts-display.tsx'),
      () => moveFile('components/keyword-cloud.tsx', 'src/components/features/keyword-cloud.tsx'),
      () => moveFile('components/repository-list.tsx', 'src/components/features/repository-list.tsx'),
      () => moveFile('components/library-analysis.tsx', 'src/components/features/library-analysis.tsx'),
    ]
  },
  
  // 第三阶段：后端重构
  phase3: {
    name: '🐍 后端重构',
    actions: [
      () => createDir('backend'),
      () => createDir('backend/scraper/core'),
      () => createDir('backend/scraper/crawlers'),
      () => createDir('backend/scraper/analyzers'),
      () => createDir('backend/scraper/utils'),
      () => createDir('backend/analysis/processors'),
      () => createDir('backend/analysis/generators'),
      () => createDir('backend/config'),
      () => createDir('backend/requirements'),
      
      // 移动 Python 文件
      () => moveFile('scraper/keyword_scraper.py', 'backend/scraper/crawlers/keyword_crawler.py'),
      () => moveFile('scraper/data_analysis.py', 'backend/analysis/processors/data_processor.py'),
      () => moveFile('scraper/code_analyzer.py', 'backend/scraper/analyzers/code_analyzer.py'),
      () => moveFile('scraper/main.py', 'backend/scraper/main.py'),
      () => moveFile('scraper/scheduler.py', 'backend/scraper/scheduler.py'),
      
      // 移动配置文件
      () => moveFile('scraper/requirements.txt', 'backend/requirements/base.txt'),
      () => moveFile('scraper/requirements-dev.txt', 'backend/requirements/dev.txt'),
      () => moveFile('scraper/pyproject.toml', 'backend/pyproject.toml'),
    ]
  },
  
  // 第四阶段：测试整合
  phase4: {
    name: '🧪 测试整合',
    actions: [
      () => createDir('tests'),
      () => createDir('tests/frontend'),
      () => createDir('tests/backend/unit'),
      () => createDir('tests/backend/integration'),
      () => createDir('tests/backend/fixtures'),
      
      // 移动测试文件
      () => moveFile('__tests__', 'tests/frontend/__tests__'),
      () => moveFile('jest.setup.js', 'tests/frontend/jest.setup.js'),
      () => moveFile('scraper/tests', 'tests/backend/unit'),
    ]
  },
  
  // 第五阶段：工具优化
  phase5: {
    name: '🔧 工具优化',
    actions: [
      () => createDir('tools/scripts/setup'),
      () => createDir('tools/scripts/testing'),
      () => createDir('tools/scripts/deployment'),
      () => createDir('tools/scripts/maintenance'),
      
      // 移动脚本文件
      () => moveFile('scripts/test-setup.js', 'tools/scripts/setup/test-setup.js'),
      () => moveFile('scripts/run-tests.sh', 'tools/scripts/testing/run-tests.sh'),
      () => moveFile('scripts/run-tests.bat', 'tools/scripts/testing/run-tests.bat'),
    ]
  },
  
  // 第六阶段：数据库整理
  phase6: {
    name: '🗄️ 数据库整理',
    actions: [
      () => createDir('database'),
      () => createDir('database/backups'),
      () => createDir('database/scripts'),
      
      // 移动数据库文件
      () => moveFile('prisma', 'database/prisma'),
    ]
  },
  
  // 第七阶段：配置整理
  phase7: {
    name: '⚙️ 配置整理',
    actions: [
      () => createDir('config'),
      () => moveFile('next.config.js', 'config/next.config.js'),
      () => moveFile('tailwind.config.js', 'config/tailwind.config.js'),
      () => moveFile('postcss.config.js', 'config/postcss.config.js'),
      () => moveFile('tsconfig.json', 'config/tsconfig.json'),
      () => moveFile('.eslintrc.json', 'config/eslint.config.json'),
    ]
  }
}

// 执行重构
async function executeRestructure() {
  const phases = Object.keys(restructurePlan)
  
  console.log(`\n${colors.blue('📋 重构计划概览:')}`)
  phases.forEach((phase, index) => {
    console.log(`  ${index + 1}. ${restructurePlan[phase].name}`)
  })
  
  console.log(`\n${colors.yellow('⚠️  注意: 请确保已备份项目或使用 Git 版本控制')}`)
  console.log(`${colors.yellow('⚠️  建议在新分支中执行重构: git checkout -b feature/restructure')}`)
  
  // 询问用户确认
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  return new Promise((resolve) => {
    rl.question(`\n${colors.cyan('是否继续执行重构? (y/N): ')}`, (answer) => {
      rl.close()
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log(`${colors.yellow('🚫 重构已取消')}`)
        resolve(false)
        return
      }
      
      console.log(`\n${colors.green('🚀 开始执行重构...')}\n`)
      
      // 执行各个阶段
      phases.forEach((phase, index) => {
        console.log(`\n${colors.bold(`第 ${index + 1} 阶段: ${restructurePlan[phase].name}`)}`)
        console.log('-'.repeat(40))
        
        restructurePlan[phase].actions.forEach(action => {
          try {
            action()
          } catch (error) {
            console.log(`${colors.red('❌')} 执行失败: ${error.message}`)
          }
        })
      })
      
      // 更新配置文件
      console.log(`\n${colors.bold('📝 更新配置文件')}`)
      console.log('-'.repeat(40))
      updatePackageJson()
      updateGitignore()
      
      console.log(`\n${colors.green('🎉 重构完成!')}`)
      console.log(`\n${colors.cyan('📋 后续步骤:')}`)
      console.log(`  1. 检查文件移动是否正确`)
      console.log(`  2. 更新 import 路径`)
      console.log(`  3. 运行测试验证功能`)
      console.log(`  4. 提交更改: git add . && git commit -m "refactor: 重构项目架构"`)
      
      resolve(true)
    })
  })
}

// 主函数
async function main() {
  try {
    await executeRestructure()
  } catch (error) {
    console.error(`${colors.red('💥 重构失败:')} ${error.message}`)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = { executeRestructure }
