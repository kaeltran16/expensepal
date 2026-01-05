/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip static optimization for error pages since they use client-side auth
  // This prevents build errors when trying to prerender pages that use cookies
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Auto-version service worker using git commit SHA or deployment ID
      const swVersion =
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||  // First 7 chars of commit SHA
        process.env.VERCEL_DEPLOYMENT_ID ||                 // Fallback to deployment ID
        `dev-${Date.now()}`                                  // Local dev fallback

      config.module.rules.push({
        test: /sw\.js$/,
        loader: 'string-replace-loader',
        options: {
          search: 'BUILD_VERSION_PLACEHOLDER',
          replace: swVersion,
          flags: 'g'
        },
      })

      console.log(`📦 Service Worker will use version: ${swVersion}`)
    }
    return config
  },
}

module.exports = nextConfig
