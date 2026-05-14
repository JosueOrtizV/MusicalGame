import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Musical Blocks — Voxel Party Game',
  description:
    'A multiplayer voxel rhythm game. Dance on colored blocks, survive the elimination, be the last one standing!',
};

import { ToastContainer } from '@/src/components/ui/ToastContainer';

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
