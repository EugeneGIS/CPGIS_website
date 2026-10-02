import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/map-preview": ["./public/cpgis-logo.png"],
  },
};

export default nextConfig;
