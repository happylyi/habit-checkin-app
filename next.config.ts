import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NODE_ENV === "production" ? ".next-prod" : ".next",
  typescript: {
    ignoreBuildErrors: true
  }
} /* config options here */;
export default nextConfig;