/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/source', destination: '/discover', permanent: true },
      { source: '/app', destination: '/brief', permanent: true },
      { source: '/insights', destination: '/thesis', permanent: true },
    ]
  },
}

export default nextConfig
