'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Trash2, AlertTriangle } from 'lucide-react'

interface CleanupResult {
  success: boolean
  message: string
  summary: {
    total_keywords: number
    total_files: number
    inconsistencies_found: number
    files_cleaned?: number
    keywords_cleaned?: number
  }
  inconsistencies?: Array<{
    type: string
    file?: string
    keyword?: string
    keywordId?: number
    action: string
  }>
}

export default function CleanupPage() {
  const [isChecking, setIsChecking] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [result, setResult] = useState<CleanupResult | null>(null)

  const checkConsistency = async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/keywords/cleanup', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else {
        console.error('检查失败')
      }
    } catch (error) {
      console.error('检查失败:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const executeCleanup = async () => {
    setIsCleaning(true)
    try {
      const response = await fetch('/api/keywords/cleanup?cleanup=true', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else {
        console.error('清理失败')
      }
    } catch (error) {
      console.error('清理失败:', error)
    } finally {
      setIsCleaning(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">数据清理工具</h1>
          <p className="text-gray-600 mt-2">检查和清理关键词数据的一致性问题</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={checkConsistency}
            disabled={isChecking || isCleaning}
            variant="outline"
          >
            {isChecking ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            检查一致性
          </Button>
          <Button
            onClick={executeCleanup}
            disabled={isChecking || isCleaning || !result?.inconsistencies?.length}
            variant="destructive"
          >
            {isCleaning ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            执行清理
          </Button>
        </div>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <Badge variant="default">成功</Badge>
              ) : (
                <Badge variant="destructive">失败</Badge>
              )}
              检查结果
            </CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{result.summary.total_keywords}</div>
                <div className="text-sm text-gray-600">总关键词数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{result.summary.total_files}</div>
                <div className="text-sm text-gray-600">总分析文件数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{result.summary.inconsistencies_found}</div>
                <div className="text-sm text-gray-600">不一致项</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(result.summary.files_cleaned || 0) + (result.summary.keywords_cleaned || 0)}
                </div>
                <div className="text-sm text-gray-600">已清理项</div>
              </div>
            </div>

            {result.inconsistencies && result.inconsistencies.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  发现的问题
                </h3>
                <div className="space-y-2">
                  {result.inconsistencies.map((item, index) => (
                    <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {item.type === 'orphan_file' ? '孤立文件' : '孤立关键词'}
                          </Badge>
                          <div className="text-sm">
                            {item.type === 'orphan_file' ? (
                              <>文件: <code>{item.file}</code> (关键词: {item.keyword})</>
                            ) : (
                              <>关键词: <strong>{item.keyword}</strong> (ID: {item.keywordId})</>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {item.action === 'delete_file' ? '删除文件' : '删除关键词'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
