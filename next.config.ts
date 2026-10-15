import type { NextConfig } from 'next';
import { withBotId } from 'botid/next/config';
import { applyOmegaStudioMediaPolicy, OMEGA_STUDIO_PATH } from './src/lib/omegatrojektorijum/media-policy';

const nextConfig: NextConfig = {
  // Reduce serverless bundle size — exclude heavy node_modules from tracing
  outputFileTracingExcludes: {
    '*': [
      './node_modules/@swc/**',
      './node_modules/typescript/**',
      './node_modules/eslint/**',
      './node_modules/@typescript-eslint/**',
    ],
  },
  headers: async () => {
    const rules = [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Powered-By', value: 'Kompanija SPAJA - OMEGA AI' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.openai.com https:; frame-src https://js.stripe.com https://io-openui-ao.pages.dev; frame-ancestors 'none'" },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
      ],
    },
    {
      source: '/api/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'no-store, max-age=0' },
      ],
    },
    ];
    const studioHeaders = new Headers(rules[0].headers.map(({ key, value }): [string, string] => [key, value]));
    applyOmegaStudioMediaPolicy(studioHeaders, OMEGA_STUDIO_PATH);
    return [...rules, {
      source: OMEGA_STUDIO_PATH,
      headers: ['Permissions-Policy', 'Content-Security-Policy'].map(key => ({ key, value: studioHeaders.get(key)! })),
    }];
  },
};

export default withBotId(nextConfig);
