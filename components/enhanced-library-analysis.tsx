'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EnhancedLibraryAnalysisProps {
  keyword?: string
  title?: string
  libraryData?: Record<string, number>
}

export function EnhancedLibraryAnalysis({ 
  keyword, 
  title = '常用库/包分析',
  libraryData: initialLibraryData
}: EnhancedLibraryAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [libraries, setLibraries] = useState<Record<string, number>>(initialLibraryData || {})
  const [librariesByLanguage, setLibrariesByLanguage] = useState<Record<string, Record<string, number>>>({})
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [totalFiles, setTotalFiles] = useState(0)
  
  // 使用ref跟踪组件是否挂载
  const isMounted = useRef(true);
  // 使用ref存储当前关键词，用于防止请求竞争
  const currentKeyword = useRef(keyword);

  // 颜色配置
  const colors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', 
    '#FF6B6B', '#4BC0C0', '#FF9F40', '#9966FF', '#FF6699',
    '#36A2EB', '#FF6384', '#4BC0C0', '#FF9F40', '#9966FF'
  ]

  // 组件挂载/卸载处理
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 当关键词变化时，更新currentKeyword ref
  useEffect(() => {
    if (keyword) {
      currentKeyword.current = keyword;
    }
  }, [keyword]);

  // 获取库分析数据
  useEffect(() => {
    // 如果有初始数据或没有关键词，不需要获取数据
    if (initialLibraryData || !keyword) return;

    const fetchLibraryData = async () => {
      setLoading(true);
      setError(null);
      // 存储这次请求的关键词，用于后续比对
      const requestKeyword = keyword;

      try {
        const response = await fetch(
          `/api/libraries?keyword=${encodeURIComponent(keyword)}${selectedLanguage !== 'all' ? `&language=${selectedLanguage}` : ''}`
        );
        
        // 如果组件已卸载或关键词已变更，不处理结果
        if (!isMounted.current || currentKeyword.current !== requestKeyword) {
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '获取库分析数据失败');
        }
        
        const data = await response.json();
        
        // 再次检查组件挂载状态和关键词
        if (!isMounted.current || currentKeyword.current !== requestKeyword) {
          return;
        }
        
        setLibraries(data.libraries || {});
        setLibrariesByLanguage(data.librariesByLanguage || {});
        setAvailableLanguages(['all', ...(data.availableLanguages || [])]);
        setTotalFiles(data.totalFiles || 0);
        
      } catch (err) {
        if (isMounted.current && currentKeyword.current === requestKeyword) {
          setError((err as Error).message || '未知错误');
          console.error('获取库分析失败:', err);
        }
      } finally {
        if (isMounted.current && currentKeyword.current === requestKeyword) {
          setLoading(false);
        }
      }
    };

    fetchLibraryData();
  }, [keyword, selectedLanguage, initialLibraryData]);

  // 准备图表数据
  const prepareChartData = () => {
    const librariesToUse = 
      selectedLanguage === 'all' || initialLibraryData
        ? libraries 
        : librariesByLanguage[selectedLanguage] || {};
    
    // 确保数据非空并格式化
    if (Object.keys(librariesToUse).length === 0) {
      return [];
    }
    
    return Object.entries(librariesToUse)
      .map(([name, count]) => ({ 
        name: name || '未命名库', 
        count: count || 0 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);  // 显示前20个
  }

  const chartData = prepareChartData();

  // 添加自定义tick渲染函数
  const CustomizedYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={-10} 
          y={0} 
          dy={4} 
          textAnchor="end" 
          fill="#666"
          style={{ fontSize: '12px' }}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  // 渲染加载状态
  if (loading && Object.keys(libraries).length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 渲染错误
  if (error && Object.keys(libraries).length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 p-4">
            <p>{error}</p>
            <p className="mt-2 text-sm">请尝试刷新页面或稍后再试</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-row justify-between items-center">
          <CardTitle>{title}</CardTitle>
          {!initialLibraryData && availableLanguages.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">语言:</span>
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="选择语言" />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map(lang => (
                    <SelectItem key={lang} value={lang}>
                      {lang === 'all' ? '所有语言' : lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}
        
        {!chartData.length ? (
          <div className="text-center py-4 text-gray-500">没有库/包分析数据</div>
        ) : (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
              >
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={150}
                  tick={CustomizedYAxisTick}
                  interval={0}
                  tickLine={false}
                  axisLine={true}
                />
                <Tooltip 
                  formatter={(value) => [`${value} 个文件中使用`, '使用频率']}
                  labelFormatter={(label) => `库: ${label}`}
                />
                <Bar 
                  dataKey="count" 
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">库/包使用统计</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {chartData.map((item, index) => (
                <div 
                  key={item.name}
                  className="flex justify-between items-center p-2 rounded border"
                >
                  <span className="font-medium" style={{ color: colors[index % colors.length] }}>
                    {item.name}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {item.count} 次
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}