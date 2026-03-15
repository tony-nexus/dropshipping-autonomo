/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // AliExpress
      { protocol: 'https', hostname: '**.aliexpress.com' },
      { protocol: 'https', hostname: '**.aliexpresscdn.com' },
      { protocol: 'https', hostname: 'ae01.alicdn.com' },
      // CJ Dropshipping
      { protocol: 'https', hostname: '**.cjdropshipping.com' },
      // Supabase Storage
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  // Expõe apenas variáveis NEXT_PUBLIC_ no lado do cliente
  env: {
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL:           process.env.NEXT_PUBLIC_APP_URL,
  },
}

module.exports = nextConfig
