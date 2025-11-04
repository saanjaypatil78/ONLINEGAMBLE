/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
    NEXT_PUBLIC_PUMP_FUN_API_URL: process.env.NEXT_PUBLIC_PUMP_FUN_API_URL,
    // TODO: add additional public env vars when integrations are ready
  },
};

module.exports = nextConfig;