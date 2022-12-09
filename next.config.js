/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    COUNTERPARTY_API_URL: "http://public.coindaddy.io:4000/api/",
  }
}

module.exports = nextConfig
