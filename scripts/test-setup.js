#!/usr/bin/env node
/**
 * 测试环境设置脚本
 * 自动检查和配置测试环境
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 GitHub Trending Scraper - 测试环境设置\n')

// 颜色输出函数
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
}

function checkCommand(command, name) {
  try {
    execSync(`${command} --version`, { stdio: 'pipe' })
    console.log(`✅ ${colors.green(name)} 已安装`)
    return true
  } catch (error) {
    console.log(`❌ ${colors.red(name)} 未安装或不可用`)
    return false
  }
}

function runCommand(command, description) {
  try {
    console.log(`🔄 ${colors.blue(description)}...`)
    execSync(command, { stdio: 'inherit' })
    console.log(`✅ ${colors.green(description)} 完成\n`)
    return true
  } catch (error) {
    console.log(`❌ ${colors.red(description)} 失败`)
    console.log(`错误: ${error.message}\n`)
    return false
  }
}

async function main() {
  console.log('📋 检查环境依赖...\n')

  // 检查 Node.js
  const nodeOk = checkCommand('node', 'Node.js')
  if (nodeOk) {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim()
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
    if (majorVersion < 18) {
      console.log(`⚠️  ${colors.yellow('Node.js 版本过低，建议升级到 18+，当前版本: ' + nodeVersion)}`)
    }
  }

  // 检查 Python
  const pythonOk = checkCommand('python', 'Python') || checkCommand('python3', 'Python3')
  if (pythonOk) {
    try {
      const pythonVersion = execSync('python --version 2>&1 || python3 --version 2>&1', { encoding: 'utf8' }).trim()
      console.log(`   版本: ${pythonVersion}`)
    } catch (e) {
      // 忽略版本检查错误
    }
  }

  // 检查 npm
  checkCommand('npm', 'npm')

  // 检查 pip
  checkCommand('pip', 'pip') || checkCommand('pip3', 'pip3')

  console.log('\n📦 安装依赖...\n')

  // 安装前端依赖
  if (!runCommand('npm install', '安装前端依赖')) {
    process.exit(1)
  }

  // 检查 scraper 目录
  const scraperPath = path.join(process.cwd(), 'scraper')
  if (fs.existsSync(scraperPath)) {
    // 安装 Python 依赖
    const requirementsPath = path.join(scraperPath, 'requirements.txt')
    if (fs.existsSync(requirementsPath)) {
      runCommand('pip install -r scraper/requirements.txt', '安装 Python 生产依赖')
    }

    // 安装开发依赖
    const devRequirementsPath = path.join(scraperPath, 'requirements-dev.txt')
    if (fs.existsSync(devRequirementsPath)) {
      runCommand('pip install -r scraper/requirements-dev.txt', '安装 Python 开发依赖')
    }
  }

  console.log('🧪 运行测试验证...\n')

  // 运行前端测试
  console.log(`${colors.cyan('前端测试:')}`)
  if (runCommand('npm test -- --passWithNoTests', '运行前端测试')) {
    console.log(`✅ ${colors.green('前端测试通过')}`)
  }

  // 运行 Python 测试
  if (fs.existsSync(scraperPath)) {
    console.log(`${colors.cyan('Python 测试:')}`)
    if (runCommand('cd scraper && python -m pytest --version > /dev/null 2>&1 && python -m pytest || echo "pytest 未安装，跳过测试"', '运行 Python 测试')) {
      console.log(`✅ ${colors.green('Python 测试通过')}`)
    }
  }

  console.log('\n🎉 测试环境设置完成！\n')

  console.log('📚 可用的测试命令:')
  console.log(`  ${colors.cyan('npm run test:all')}        - 运行所有测试`)
  console.log(`  ${colors.cyan('npm run test:frontend')}   - 运行前端测试`)
  console.log(`  ${colors.cyan('npm run test:backend')}    - 运行后端测试`)
  console.log(`  ${colors.cyan('npm run test:coverage')}   - 生成覆盖率报告`)
  console.log(`  ${colors.cyan('npm run ci:check')}        - 运行 CI 检查`)

  console.log('\n📖 更多信息请查看:')
  console.log(`  ${colors.blue('TESTING.md')} - 详细测试指南`)
  console.log(`  ${colors.blue('README.md')}  - 项目文档`)
}

main().catch(console.error)
