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

  // 严格模式
  reactStrictMode: true,

  // SWC 配置
  swcMinify: true,

  // ESLint 配置
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
