import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 本番環境でソースマップを有効化（デバッグ用）
  productionBrowserSourceMaps: true,
};

export default nextConfig;
