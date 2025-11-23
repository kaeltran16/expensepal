/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip static optimization for error pages since they use client-side auth
  // This prevents build errors when trying to prerender pages that use cookies
  
}

module.exports = nextConfig
