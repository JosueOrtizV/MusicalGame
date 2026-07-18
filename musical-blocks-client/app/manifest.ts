import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VoxelRave — 3D Voxel Rhythm Party Game',
    short_name: 'VoxelRave',
    description: 'Free 3D multiplayer rhythm party game. Dance, survive, and be the last standing!',
    start_url: '/',
    display: 'fullscreen',
    orientation: 'any',
    background_color: '#0f0f23',
    theme_color: '#0f0f23',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
