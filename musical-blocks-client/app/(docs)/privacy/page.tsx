import type { Metadata } from 'next';
import { PrivacyClient } from '@/src/components/ui/PrivacyClient';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description:
    'Lee la política de privacidad de VoxelRave. Conoce cómo gestionamos los datos de sesión, ajustes locales y puntajes de la tabla de clasificación en nuestro juego de ritmo 3D.',
  alternates: {
    canonical: 'https://voxelrave.com/privacy',
  },
  openGraph: {
    title: 'Política de Privacidad VoxelRave — Protocolo de Seguridad',
    description: 'Aprende cómo protegemos tus datos. Recopilación mínima, sin registro de cuentas.',
    url: 'https://voxelrave.com/privacy',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'VoxelRave — Juego de Fiesta Voxel 3D',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Política de Privacidad VoxelRave — Protocolo de Seguridad',
    description: 'Aprende cómo protegemos tus datos. Recopilación mínima, sin registro de cuentas.',
    images: ['/og-image.jpg'],
  },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
