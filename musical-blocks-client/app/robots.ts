import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',               // API endpoints
          '/multiplayer/*/',     // Dynamic room routes (/multiplayer/[roomId])
        ],
      },
    ],
    sitemap: 'https://voxelrave.com/sitemap.xml',
  };
}
