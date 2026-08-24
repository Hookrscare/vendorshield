/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/downloads/inspector-toolkit": [
      "./private-assets/inspector-business-toolkit-2026.zip",
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
