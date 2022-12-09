/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    COUNTERPARTY_API_URL: "https://public.coindaddy.io:4001/api/",
  }
}

module.exports = nextConfig
