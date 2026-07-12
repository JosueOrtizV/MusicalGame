import type { Metadata } from 'next';
import { MultiplayerBrowser } from '@/src/components/ui/MultiplayerBrowser';

export const metadata: Metadata = {
  title: 'Lobby Multijugador — Unirse a Salas',
  description:
    'Únete o crea salas multijugador en VoxelRave. Juega al juego de ritmo 3D con amigos en línea. Conexión instantánea con baja latencia.',
  alternates: {
    canonical: 'https://voxelrave.com/multiplayer',
  },
  openGraph: {
    title: 'Lobby Multijugador VoxelRave — Juega en Línea',
    description: 'Encuentra salas públicas o crea una sala privada para jugar con amigos.',
    url: 'https://voxelrave.com/multiplayer',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VoxelRave — Juego de Fiesta Voxel 3D',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lobby Multijugador VoxelRave — Juega en Línea',
    description: 'Encuentra salas públicas o crea una sala privada para jugar con amigos.',
    images: ['/og-image.png'],
  },
};

export default function MultiplayerPage() {
  return <MultiplayerBrowser />;
}
