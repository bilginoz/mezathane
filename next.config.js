/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  outputFileTracingIncludes: {
    '/api/ledger/pdf': ['node_modules/@sparticuz/chromium/bin/**'],
    '/api/invoice/[lotId]': ['node_modules/@sparticuz/chromium/bin/**'],
    '/api/seller/proforma': ['node_modules/@sparticuz/chromium/bin/**'],
    '/api/seller/commission-invoice': ['node_modules/@sparticuz/chromium/bin/**'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output.filename = 'static/chunks/[name]-[contenthash:8].js';
      config.output.chunkFilename = 'static/chunks/[contenthash:16].js';
    }
    return config;
  },
};

module.exports = nextConfig;
