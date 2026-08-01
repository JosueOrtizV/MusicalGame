import type { Metadata } from 'next';
import { TermsClient } from '@/src/components/ui/TermsClient';

export const metadata: Metadata = {
  title: 'Términos de Servicio',
  description:
    'Revisa los términos de servicio para jugar a VoxelRave (Musical Blocks). Infórmate sobre licencias de uso, código de conducta y disponibilidad del servicio.',
  alternates: {
    canonical: 'https://voxelrave.com/terms',
  },
  openGraph: {
    title: 'Términos de Servicio VoxelRave',
    description: 'Revisa los términos de uso y las reglas de conducta de nuestra comunidad.',
    url: 'https://voxelrave.com/terms',
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
    title: 'Términos de Servicio VoxelRave',
    description: 'Revisa los términos de uso y las reglas de conducta de nuestra comunidad.',
    images: ['/og-image.jpg'],
  },
};

export default function TermsPage() {
  return <TermsClient />;
}
