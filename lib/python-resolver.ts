/**
 * Python 解释器解析工具
 * 用于在不同环境中找到合适的 Python 解释器
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * 解析 Python 解释器路径
 * @param majorVersion 主版本号
 * @param minorVersion 次版本号
 * @returns Python 解释器命令
 */
export async function resolvePythonBin(majorVersion = 3, minorVersion = 12): Promise<string> {
  // 如果环境变量中指定了 Python 路径，直接使用
  if (process.env.PYTHON_BIN) {
    try {
      await validatePythonVersion(process.env.PYTHON_BIN, majorVersion, minorVersion)
      return process.env.PYTHON_BIN
    } catch (error) {
      console.warn(`指定的 Python 解释器 ${process.env.PYTHON_BIN} 不满足版本要求: ${error}`)
    }
  }

  // 尝试不同的 Python 命令
  const candidates = [
    `py -${majorVersion}.${minorVersion}`,  // Windows Python Launcher
    `python${majorVersion}.${minorVersion}`, // 具体版本
    `python${majorVersion}`,                 // 主版本
    'python',                                // 默认
  ]

  for (const candidate of candidates) {
    try {
      await validatePythonVersion(candidate, majorVersion, minorVersion)
      return candidate
    } catch (error) {
      // 继续尝试下一个候选
      continue
    }
  }

  throw new Error(
    `未找到满足版本要求 (>= ${majorVersion}.${minorVersion}) 的 Python 解释器。` +
    `请安装 Python ${majorVersion}.${minorVersion}+ 或设置 PYTHON_BIN 环境变量。`
  )
}

/**
 * 验证 Python 版本
 * @param pythonCmd Python 命令
 * @param majorVersion 要求的主版本号
 * @param minorVersion 要求的次版本号
 */
async function validatePythonVersion(
  pythonCmd: string, 
  majorVersion: number, 
  minorVersion: number
): Promise<void> {
  try {
    const { stdout } = await execAsync(`${pythonCmd} --version`)
    const versionMatch = stdout.match(/Python (\d+)\.(\d+)\.(\d+)/)
    
    if (!versionMatch) {
      throw new Error(`无法解析 Python 版本: ${stdout}`)
    }

    const [, major, minor] = versionMatch.map(Number)
    
    if (major < majorVersion || (major === majorVersion && minor < minorVersion)) {
      throw new Error(
        `Python 版本 ${major}.${minor} 不满足要求 (>= ${majorVersion}.${minorVersion})`
      )
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new Error(`Python 解释器 '${pythonCmd}' 未找到`)
    }
    throw error
  }
}

/**
 * 获取 Python 版本信息
 * @param pythonCmd Python 命令
 * @returns 版本信息对象
 */
export async function getPythonVersion(pythonCmd: string): Promise<{
  major: number
  minor: number
  patch: number
  full: string
}> {
  try {
    const { stdout } = await execAsync(`${pythonCmd} --version`)
    const versionMatch = stdout.match(/Python (\d+)\.(\d+)\.(\d+)/)
    
    if (!versionMatch) {
      throw new Error(`无法解析 Python 版本: ${stdout}`)
    }

    const [full, major, minor, patch] = versionMatch
    
    return {
      major: Number(major),
      minor: Number(minor),
      patch: Number(patch),
      full: full.replace('Python ', '')
    }
  } catch (error) {
    throw new Error(`获取 Python 版本失败: ${error}`)
  }
}
