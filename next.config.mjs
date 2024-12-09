/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  eslint: {
    ignoreDuringBuilds: true,
  },
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, {isServer}) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs']
    }
    // config.resolve.fallback = {
    //   ...config.resolve.fallback,
    //   fs: false,
    //   path: false,
    //   "pg-hstore": false,
    //   crypto: false,
    //   stream: false,
    //   http: false,
    //   https: false,
    //   zlib: false,
    //   net: false,
    //   tls: false,
    // }
    if (isServer) {
      config.output.publicPath = '/_next/';
    }
    return config
  }
}

export default nextConfig;