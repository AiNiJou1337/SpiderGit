import { NextRequest, NextResponse } from 'next/server';

// 重定向到新的trends API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '300';
  const language = searchParams.get('language') || 'all';
  
  // 重定向到新的API端点
  const newUrl = new URL('/api/trends', request.url);
  newUrl.searchParams.set('period', 'monthly');
  newUrl.searchParams.set('limit', limit);
  newUrl.searchParams.set('language', language);
  
  return NextResponse.redirect(newUrl);
}
