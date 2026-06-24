/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium-min', 'playwright-core', 'playwright'],
    outputFileTracingIncludes: {
      '/api/pdf': ['./node_modules/@sparticuz/chromium-min/**'],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@sparticuz/chromium-min', 'playwright-core', 'playwright']
    }
    return config
  },
  async redirects() {
    return [
      { source: '/source', destination: '/discover', permanent: true },
      { source: '/app', destination: '/brief', permanent: true },
      { source: '/insights', destination: '/thesis', permanent: true },
    ]
  },
}

export default nextConfig
