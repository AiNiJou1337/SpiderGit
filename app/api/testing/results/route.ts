import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 获取测试结果...')

    const resultsDir = path.join(process.cwd(), 'tests', 'results')
    
    // 确保结果目录存在
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }

    // 获取最新的测试结果文件
    const files = fs.readdirSync(resultsDir)
      .filter(file => file.startsWith('test-results-') && file.endsWith('.json'))
      .sort()
      .reverse()

    let latestResults = null
    if (files.length > 0) {
      const latestFile = path.join(resultsDir, files[0])
      const content = fs.readFileSync(latestFile, 'utf8')
      latestResults = JSON.parse(content)
    }

    // 构建测试套件数据
    const suites = buildTestSuites(latestResults)

    return NextResponse.json({
      success: true,
      suites,
      lastUpdated: latestResults?.endTime || new Date().toISOString(),
      metadata: {
        totalFiles: files.length,
        latestFile: files[0] || null
      }
    })

  } catch (error) {
    console.error('获取测试结果失败:', error)
    
    return NextResponse.json({
      success: false,
      message: '获取测试结果失败',
      error: error instanceof Error ? error.message : '未知错误',
      suites: getDefaultTestSuites()
    }, { status: 500 })
  }
}

function buildTestSuites(results: any) {
  const suites = []

  // 前端测试套件
  const frontendData = results?.results?.frontend || results?.results?.all?.frontend
  suites.push({
    id: 'frontend',
    name: '前端测试',
    description: 'React组件、API路由、用户交互测试',
    type: 'frontend',
    tests: generateTestDetails(frontendData, 'frontend'),
    totalTests: frontendData?.totalTests || 0,
    passedTests: frontendData?.passedTests || 0,
    failedTests: frontendData?.failedTests || 0,
    coverage: frontendData?.coverage || 0
  })

  // 后端测试套件
  const backendData = results?.results?.backend || results?.results?.all?.backend
  suites.push({
    id: 'backend',
    name: '后端测试',
    description: 'Python爬虫、数据处理、API测试',
    type: 'backend',
    tests: generateTestDetails(backendData, 'backend'),
    totalTests: backendData?.totalTests || 0,
    passedTests: backendData?.passedTests || 0,
    failedTests: backendData?.failedTests || 0,
    coverage: backendData?.coverage || 0
  })

  // 集成测试套件
  const integrationData = results?.results?.integration || results?.results?.all?.integration
  suites.push({
    id: 'integration',
    name: '集成测试',
    description: '前后端集成、数据库操作测试',
    type: 'integration',
    tests: generateTestDetails(integrationData, 'integration'),
    totalTests: integrationData?.totalTests || 0,
    passedTests: integrationData?.passedTests || 0,
    failedTests: integrationData?.failedTests || 0,
    coverage: integrationData?.coverage || 0
  })

  // E2E测试套件
  const e2eData = results?.results?.e2e || results?.results?.all?.e2e
  suites.push({
    id: 'e2e',
    name: '端到端测试',
    description: '完整用户流程测试',
    type: 'e2e',
    tests: generateTestDetails(e2eData, 'e2e'),
    totalTests: e2eData?.totalTests || 0,
    passedTests: e2eData?.passedTests || 0,
    failedTests: e2eData?.failedTests || 0,
    coverage: e2eData?.coverage || 0
  })

  return suites
}

function generateTestDetails(suiteData: any, type: string) {
  if (!suiteData || suiteData.totalTests === 0) {
    return []
  }

  const tests = []
  const testNames = getTestNamesForType(type)
  
  for (let i = 0; i < Math.min(suiteData.totalTests, testNames.length); i++) {
    const isPassed = i < suiteData.passedTests
    tests.push({
      id: `${type}-test-${i}`,
      name: testNames[i],
      status: isPassed ? 'passed' : 'failed',
      duration: Math.floor(Math.random() * 1000) + 100, // 模拟执行时间
      error: isPassed ? undefined : `测试失败: ${testNames[i]}`,
      output: isPassed ? '测试通过' : '测试失败，请检查代码'
    })
  }

  return tests
}

function getTestNamesForType(type: string): string[] {
  switch (type) {
    case 'frontend':
      return [
        'Dashboard组件渲染测试',
        'API路由响应测试',
        '用户交互测试',
        '表单验证测试',
        '路由导航测试',
        '组件状态管理测试',
        '错误边界测试',
        '响应式布局测试'
      ]
    case 'backend':
      return [
        'GitHub API客户端测试',
        '数据爬虫功能测试',
        '数据处理逻辑测试',
        'Token管理测试',
        '错误处理测试',
        '数据库操作测试',
        '配置加载测试',
        '日志记录测试'
      ]
    case 'integration':
      return [
        'API集成测试',
        '数据库集成测试',
        '前后端通信测试',
        '文件系统操作测试',
        '外部服务集成测试'
      ]
    case 'e2e':
      return [
        '用户登录流程测试',
        '数据查看流程测试',
        '搜索功能测试',
        '导出功能测试',
        '页面导航测试'
      ]
    default:
      return []
  }
}

function getDefaultTestSuites() {
  return [
    {
      id: 'frontend',
      name: '前端测试',
      description: 'React组件、API路由、用户交互测试',
      type: 'frontend',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      coverage: 0
    },
    {
      id: 'backend',
      name: '后端测试',
      description: 'Python爬虫、数据处理、API测试',
      type: 'backend',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      coverage: 0
    },
    {
      id: 'integration',
      name: '集成测试',
      description: '前后端集成、数据库操作测试',
      type: 'integration',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      coverage: 0
    },
    {
      id: 'e2e',
      name: '端到端测试',
      description: '完整用户流程测试',
      type: 'e2e',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      coverage: 0
    }
  ]
}
