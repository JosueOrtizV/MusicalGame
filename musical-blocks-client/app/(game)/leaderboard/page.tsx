import type { Metadata } from 'next';
import { LeaderboardClient } from '@/src/components/ui/LeaderboardClient';
import { fetchTopScores } from '@/src/lib/supabase/leaderboard';

export const metadata: Metadata = {
  title: 'Tabla de Clasificación — Top 50 Mundial',
  description: 'Consulta la clasificación global de VoxelRave. Mira a los 50 mejores jugadores del mundo en este juego de ritmo 3D gratuito. Filtra por dificultad: Fácil, Normal, Difícil, Experto.',
  alternates: {
    canonical: 'https://voxelrave.com/leaderboard',
  },
  openGraph: {
    title: 'Tabla de Clasificación VoxelRave — Top 50 Mundial',
    description: '¿Quién domina la pista de baile? Consulta la tabla de clasificación global.',
    url: 'https://voxelrave.com/leaderboard',
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
    title: 'Tabla de Clasificación VoxelRave — Top 50 Mundial',
    description: '¿Quién domina la pista de baile? Consulta la tabla de clasificación global.',
    images: ['/og-image.jpg'],
  },
};

// Revalidar caché cada hora (ISR)
export const revalidate = 3600;

export default async function LeaderboardPage() {
  // Obtener puntajes iniciales en el servidor para indexación
  const initialScores = await fetchTopScores(50);
  
  return <LeaderboardClient initialScores={initialScores} />;
}
