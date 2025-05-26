/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  },
};

module.exports = nextConfig; 