import { Orbitron, Outfit, Press_Start_2P, VT323 } from 'next/font/google';

export const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '900'],
  display: 'swap',
  variable: '--font-orbitron',
});

export const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  display: 'swap',
  variable: '--font-modern',
});

export const pressStart = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-display',
});

export const vt323 = VT323({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-body',
});
