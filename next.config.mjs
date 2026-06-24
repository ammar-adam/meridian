/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'playwright-core', 'playwright'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@sparticuz/chromium', 'playwright-core', 'playwright']
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
