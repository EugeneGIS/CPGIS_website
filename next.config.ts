import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/map-preview": ["./public/cpgis-logo.png"],
  },
};

export default nextConfig;
