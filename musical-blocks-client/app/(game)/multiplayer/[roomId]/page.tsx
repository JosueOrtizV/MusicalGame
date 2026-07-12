import type { Metadata } from 'next';
import { RoomClient } from '@/src/components/ui/RoomClient';

export const metadata: Metadata = {
  title: 'Arena Multijugador',
  description: 'Únete a una sala privada en VoxelRave y juega al juego de ritmo 3D con amigos en tiempo real.',
  robots: {
    index: false, // Evita que los crawlers indexen lobbies de salas dinámicas
    follow: false,
  },
};

export default function MultiplayerRoomPage() {
  return <RoomClient />;
}
