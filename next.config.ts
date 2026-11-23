import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    serverExternalPackages: ['mongoose'],

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'pub-8f1538554ef5413f9b6101e5d67fd1ea.r2.dev',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'pub-1ce5a3b4ac9d4626af168f31e6783352.r2.dev',
                pathname: '/**',
            },
        ],
    },

    allowedDevOrigins: ['192.168.1.11'],

    async redirects() {
        return [
            {
                source: '/dashboard/staff%20salary',
                destination: '/dashboard/staff-salary',
                permanent: false,
            },
            {
                source: '/dashboard/staff%20salary/:path*',
                destination: '/dashboard/staff-salary/:path*',
                permanent: false,
            },
        ];
    },

    // Use the actual project directory on Windows or other platforms.
    outputFileTracingRoot: process.cwd(),

    experimental: {
        agentUpgrade: false,
    },
}

export default nextConfig
