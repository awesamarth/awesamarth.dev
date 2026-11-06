import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.hashnode.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      { source: "/faff-resume", destination: "/resumes/faff-resume.pdf" },
    ];
  },
  async headers() {
    const pdfHeaders = [
      { key: "Content-Type", value: "application/pdf" },
      { key: "Content-Disposition", value: 'inline; filename="Samarth_Saxena_Resume.pdf"' },
      { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
    ];
    return [
      { source: "/faff-resume", headers: pdfHeaders },
      { source: "/resumes/:file*", headers: pdfHeaders },
    ];
  },
};

export default nextConfig;

