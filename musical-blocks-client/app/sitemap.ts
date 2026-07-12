import type { MetadataRoute } from 'next';

const BASE_URL = 'https://voxelrave.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // ── Home ─────────────────────────────
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: { en: BASE_URL, es: BASE_URL },
      },
    },
    // ── Singleplayer ─────────────────────────────────
    {
      url: `${BASE_URL}/singleplayer`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // ── Multiplayer lobby ────────────────────────────
    {
      url: `${BASE_URL}/multiplayer`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // ── Leaderboard ──────────────────────────────────
    {
      url: `${BASE_URL}/leaderboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // ── Legal pages ──────────────────────────────────
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
