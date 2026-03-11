import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Required for distroless / minimal runtime images: produces .next/standalone
  // with a self-contained server.js — no full node_modules needed at runtime.
  output: "standalone",
};

export default nextConfig;
