import type { Metadata } from 'next';
import { HomeScreen } from '@/src/components/ui/HomeScreen';
import { JsonLd } from '@/src/components/seo/JsonLd';
import { getBreadcrumbSchema, getFAQSchema } from '@/src/lib/seo/jsonld';

export const metadata: Metadata = {
  title: 'VoxelRave — Juego de Fiesta Voxel Multijugador 3D | Juega Ahora',
  description:
    'Juego de ritmo multijugador 3D gratuito. Baila sobre bloques de colores, sobrevive a la eliminación y sé el último en pie. ¡Juega con amigos al instante sin descargas!',
  alternates: {
    canonical: 'https://voxelrave.com',
  },
};

export default function Home() {
  const faqs = [
    {
      question: '¿Qué es VoxelRave?',
      answer: 'VoxelRave es un juego de ritmo multijugador 3D gratuito en el navegador. Los jugadores deben bailar sobre bloques de colores y sobrevivir a rondas de eliminación rápidas.',
    },
    {
      question: '¿Cómo juego VoxelRave con amigos?',
      answer: 'Puedes crear una sala multijugador privada desde el lobby y compartir el código o enlace de la sala con tus amigos para jugar juntos en tiempo real.',
    },
    {
      question: '¿VoxelRave requiere descargas o cuentas?',
      answer: 'No, VoxelRave se ejecuta directamente en cualquier navegador moderno compatible con WebGL 2.0 en computadoras y dispositivos móviles. No requiere descargas, instalaciones ni registro de cuentas.',
    },
  ];

  return (
    <>
      {/* Contenido exclusivo para SEO: visible para crawlers, oculto en UI interactiva */}
      <h1 className="sr-only">
        VoxelRave — Juego de Fiesta Voxel Multijugador 3D
      </h1>
      <p className="sr-only">
        Baila sobre bloques de colores, sobrevive a rondas de eliminación y sé el último jugador
        en pie. Juega solo o con amigos en multijugador: gratis, al instante y sin descargas.
        Disponible en inglés y español.
      </p>
      
      {/* Marcado de datos estructurados para Google y Motores de Respuesta IA (AEO) */}
      <JsonLd
        data={[
          getBreadcrumbSchema([{ name: 'Inicio', url: 'https://voxelrave.com' }]),
          getFAQSchema(faqs),
        ]}
      />
      {/* UI interactiva del cliente */}
      <HomeScreen />
    </>
  );
}
