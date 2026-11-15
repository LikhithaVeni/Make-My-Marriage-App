import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The end-to-end tests run their own dev server beside `pnpm dev`; Next.js
  // locks its build folder, so they build into `.next-e2e` (decision 65).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
