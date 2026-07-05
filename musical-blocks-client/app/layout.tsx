import type { Metadata } from 'next';
import './globals.css';
import { ToastContainer } from '@/src/components/ui/ToastContainer';
import { HtmlLangSync } from '@/src/components/ui/HtmlLangSync';
import { GlobalAudioPlayer } from '@/src/components/audio/GlobalAudioPlayer';

export const metadata: Metadata = {
  metadataBase: new URL('https://voxelrave.com'),
  title: {
    default: 'VoxelRave — Juego de Fiesta Voxel Multijugador 3D',
    template: '%s | VoxelRave',
  },
  description: 'Juego de ritmo multijugador 3D gratuito. Baila sobre bloques de colores, sobrevive la eliminación y sé el último en pie. ¡Juega con amigos desde el navegador sin descargas!',
  keywords: [
    'voxelrave', 'voxel party game', 'juego multijugador de ritmo',
    'multiplayer browser game', 'block party game online',
    '3D rhythm game free', 'juego de bloques online gratis',
    'browser party game with friends',
  ],
  authors: [{ name: 'VoxelRave Team' }],
  creator: 'VoxelRave',
  openGraph: {
    title: 'VoxelRave — Juego de Fiesta Voxel Multijugador 3D',
    description: 'Baila sobre bloques de colores, sobrevive la eliminación y sé el último en pie. ¡Gratis y sin descargas!',
    url: 'https://voxelrave.com',
    siteName: 'VoxelRave',
    locale: 'es_ES',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'VoxelRave — Juego de Fiesta Voxel 3D' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoxelRave — Juego de Fiesta Voxel Multijugador 3D',
    description: 'Baila, sobrevive, gana. Juego 3D multijugador gratis en el navegador.',
    images: ['/og-image.png'],
  },
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
  other: { 'theme-color': '#0f0f23' },
  alternates: {
    canonical: 'https://voxelrave.com',
    languages: { 'en': 'https://voxelrave.com', 'es': 'https://voxelrave.com' }
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VoxelRave",
    "applicationCategory": "Game",
    "applicationSubCategory": "Party Game",
    "operatingSystem": "Web Browser",
    "description": "Juego de ritmo multijugador 3D gratuito. Baila sobre bloques de colores, sobrevive la eliminación y sé el último en pie. ¡Juega con amigos desde el navegador sin descargas!",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD"
    },
    "inLanguage": ["es", "en"]
  };

  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <GlobalAudioPlayer />
        <HtmlLangSync />
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
