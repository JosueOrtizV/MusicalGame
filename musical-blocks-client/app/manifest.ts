import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VoxelRave — Juego de Fiesta Voxel 3D',
    short_name: 'VoxelRave',
    description: 'Juego de ritmo multijugador 3D gratuito. ¡Baila, sobrevive y gana!',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f23',
    theme_color: '#7c3aed',
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
