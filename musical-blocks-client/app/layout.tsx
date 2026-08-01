import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastContainer } from '@/src/components/ui/ToastContainer';
import { HtmlLangSync } from '@/src/components/ui/HtmlLangSync';
import { GlobalAudioPlayer } from '@/src/components/audio/GlobalAudioPlayer';
import { StoreHydrator } from '@/src/components/ui/StoreHydrator';
import { orbitron, outfit, pressStart, vt323 } from '@/src/lib/fonts';
import { JsonLd } from '@/src/components/seo/JsonLd';
import { getVideoGameSchema, getOrganizationSchema, getWebApplicationSchema } from '@/src/lib/seo/jsonld';

// ── Viewport (Next.js 16 API) ──────────────────────────────────────
export const viewport: Viewport = {
  themeColor: '#0f0f23',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: 'dark',
};

// ── Static Metadata ────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL('https://voxelrave.com'),
  applicationName: 'VoxelRave',
  title: {
    default: 'VoxelRave — Juego de Fiesta Voxel Multijugador 3D',
    template: '%s | VoxelRave',
  },
  description:
    'Juego de ritmo multijugador 3D gratuito. Baila sobre bloques, sobrevive a la eliminación y sé el último en pie. ¡Juega gratis en tu navegador sin descargas!',
  keywords: [
    'voxelrave', 'voxel party game', 'juego multijugador de ritmo',
    'multiplayer browser game', 'block party game online',
    '3D rhythm game free', 'juego de bloques online gratis',
    'browser party game with friends', 'juego arcade de ritmo',
  ],
  authors: [{ name: 'VoxelRave Studios' }],
  creator: 'VoxelRave Studios',
  publisher: 'VoxelRave Studios',
  category: 'Games',
  openGraph: {
    title: 'VoxelRave — Juego de Fiesta Voxel Multijugador 3D',
    description:
      'Baila sobre bloques de colores, sobrevive a la eliminación y sé el último en pie. ¡Gratis y al instante sin descargas!',
    url: 'https://voxelrave.com',
    siteName: 'VoxelRave',
    locale: 'es_MX',
    alternateLocale: ['en_US'],
    type: 'website',
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
    site: '@ElEstofado',
    creator: '@ElEstofado',
    title: 'VoxelRave — Juego de Fiesta Voxel Multijugador 3D',
    description: 'Baila, sobrevive, gana. Juego 3D multijugador gratis en el navegador.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.png' },
    ],
    apple: '/apple-icon.png',
  },
  alternates: {
    canonical: 'https://voxelrave.com',
    languages: {
      'es': 'https://voxelrave.com',
      'en': 'https://voxelrave.com',
      'x-default': 'https://voxelrave.com',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VoxelRave',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        {/* Preload critical 3D model */}
        <link rel="preload" href="/models/player.glb" as="fetch" crossOrigin="anonymous" />
        
        {/* Inject Structured Schemas */}
        <JsonLd data={[getVideoGameSchema(), getOrganizationSchema(), getWebApplicationSchema()]} />
      </head>
      <body className={`${outfit.variable} ${orbitron.variable} ${vt323.variable} ${pressStart.variable} font-sans antialiased text-white overflow-hidden bg-black`}>
        <StoreHydrator />
        <GlobalAudioPlayer />
        <HtmlLangSync />
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
