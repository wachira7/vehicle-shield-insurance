// next.config.js
const nextConfig = {
  /* Your existing config options */
  
  // Add headers configuration for Content Security Policy
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.g.alchemy.com wss://*.walletconnect.org;"
          }
        ]
      }
    ];
  }
};

export default nextConfig;