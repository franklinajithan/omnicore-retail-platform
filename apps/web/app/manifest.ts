import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OmniCore Retail Operations',
    short_name: 'OmniCore',
    description: 'Retail operations, product catalogue and inventory workspace',
    start_url: '/catalog',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f7fa',
    theme_color: '#101f35',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
