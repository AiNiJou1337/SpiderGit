/** @type {import('next').NextConfig} */
const nextConfig = {
  // 实验性功能
  experimental: {
    // 启用服务器组件
    serverComponentsExternalPackages: ['prisma'],
  },
  
  // 图片配置
  images: {
    domains: ['github.com', 'avatars.githubusercontent.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // 重定向配置
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },
  
  // 重写配置
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*',
      },
    ]
  },
  
  // Webpack 配置
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 添加自定义 webpack 配置
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    
    return config
  },
  
  // 输出配置
  output: 'standalone',
  
  // 压缩配置
  compress: true,
  
  // 电源配置
  poweredByHeader: false,
  
  // 严格模式
  reactStrictMode: true,
  
  // SWC 配置
  swcMinify: true,
  
  // 类型检查
  typescript: {
    // 在生产构建时忽略类型错误（不推荐）
    // ignoreBuildErrors: false,
  },
  
  // ESLint 配置
  eslint: {
    // 在生产构建时忽略 ESLint 错误（不推荐）
    // ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
