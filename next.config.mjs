/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                source: '/.well-known/apple-developer-merchantid-domain-association',
                headers: [
                    { key: 'Content-Type', value: 'application/json' },
                ],
            },
            {
                // Filenames are reused across re-encodes, so only mark immutable
                // if a future video swap also changes the filename (cache-busting).
                source: '/assets/videos/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
            {
                // Directory suffix (_v2) is the cache-busting mechanism — any future
                // re-encode should ship under a new suffix rather than overwrite in place.
                source: '/assets/images/Heclura_Desk_Frames_v2/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://client.crisp.chat",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://client.crisp.chat",
                            "font-src 'self' https://fonts.gstatic.com https://client.crisp.chat",
                            "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://*.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://client.crisp.chat https://image.crisp.chat https://img.youtube.com",
                            "frame-src https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://www.youtube-nocookie.com https://game.crisp.chat",
                            "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.postcodes.io https://api.resend.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://client.crisp.chat wss://client.relay.crisp.chat",
                        ].join('; ')
                    },
                ],
            },
        ]
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                pathname: '/storage/v1/object/public/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'img.youtube.com',
            },
        ],
    },
};

export default nextConfig;
