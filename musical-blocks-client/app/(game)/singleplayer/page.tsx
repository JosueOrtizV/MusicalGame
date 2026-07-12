import type { Metadata } from 'next';
import { SinglePlayerClient } from '@/src/components/ui/SinglePlayerClient';

export const metadata: Metadata = {
  title: 'Arena de Práctica Un Jugador',
  description:
    'Practica y supera tus puntuaciones máximas en el modo de un jugador de VoxelRave. Configura rondas, colores, vidas y multiplicadores de velocidad. Acción rítmica en 3D para navegador.',
  alternates: {
    canonical: 'https://voxelrave.com/singleplayer',
  },
  openGraph: {
    title: 'VoxelRave Modo Solitario — Práctica y Puntuaciones Máximas',
    description: 'Personaliza tu modo de práctica y baila en solitario para conquistar la tabla de clasificación.',
    url: 'https://voxelrave.com/singleplayer',
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
    title: 'VoxelRave Modo Solitario — Práctica y Puntuaciones Máximas',
    description: 'Personaliza tu modo de práctica y baila en solitario para conquistar la tabla de clasificación.',
    images: ['/og-image.png'],
  },
};

export default function SinglePlayerPage() {
  return <SinglePlayerClient />;
}
