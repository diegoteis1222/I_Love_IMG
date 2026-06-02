/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Sharp se ejecuta nativo en Node, no transpilar
    serverComponentsExternalPackages: ['sharp']
  },
  // Subidas grandes hasta el límite configurable (en MB)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' }
        ]
      }
    ];
  }
};

export default nextConfig;
