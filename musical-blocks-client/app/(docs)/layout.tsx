'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/src/hooks/useTranslation';
import { FloatingMusicNotes } from '@/src/components/ui/FloatingMusicNotes';
import { BackArrowIcon } from '@/src/components/ui/Icons';
import { MenuFooter } from '@/src/components/ui/MenuFooter';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="relative h-[100dvh] w-full bg-[#1c0f1a] text-[#dcbed4] select-text font-mono flex flex-col items-center justify-start py-12 pb-28 px-4 md:px-8 overflow-y-auto">
      {/* Starry Sky Background (Scattered) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-75"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 25px 35px, rgba(255, 255, 255, 0.6) 100%, transparent),
            radial-gradient(1.5px 1.5px at 85px 15px, rgba(255, 255, 255, 0.4) 100%, transparent),
            radial-gradient(1px 1px at 130px 120px, rgba(255, 255, 255, 0.5) 100%, transparent),
            radial-gradient(2px 2px at 220px 50px, rgba(255, 255, 255, 0.3) 100%, transparent),
            radial-gradient(1px 1px at 50px 230px, rgba(255, 255, 255, 0.7) 100%, transparent),
            radial-gradient(1.5px 1.5px at 180px 190px, rgba(255, 255, 255, 0.4) 100%, transparent),
            radial-gradient(1px 1px at 270px 280px, rgba(255, 255, 255, 0.5) 100%, transparent),
            radial-gradient(1px 1px at 15px 115px, rgba(255, 255, 255, 0.3) 100%, transparent),
            radial-gradient(1px 1px at 160px 250px, rgba(255, 255, 255, 0.4) 100%, transparent),
            radial-gradient(1.5px 1.5px at 290px 140px, rgba(255, 255, 255, 0.6) 100%, transparent)
          `,
          backgroundSize: '300px 300px',
        }}
        aria-hidden="true"
      />

      {/* CRT Scanlines & Noise */}
      <div className="fixed inset-0 scanline-overlay z-50 pointer-events-none"></div>
      <div className="noise-bg" aria-hidden="true"></div>

      {/* Background Particles/Notes */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <FloatingMusicNotes />
      </div>

      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 text-[#00fbfb] font-retro text-xs md:text-sm font-bold uppercase tracking-widest bg-transparent border-none p-0 cursor-pointer z-50 flex items-center gap-2 hover:text-[#ffabf3] transition-all duration-300 group hover:drop-shadow-[0_0_8px_rgba(255,171,243,0.8)]"
      >
        <BackArrowIcon size={20} className="group-hover:-translate-x-1 transition-transform text-glow-cyan" />
        <span>{t('back').replace('← ', '')}</span>
      </Link>

      {/* Main Container Card */}
      <div className="relative w-full max-w-4xl bg-[#160a15] border border-[#00fbfb]/30 shadow-[0_0_50px_rgba(0,251,251,0.1)] p-6 md:p-12 mt-8 mb-4 rounded-sm z-10 flex flex-col gap-6">
        {/* Corner Accents */}
        <div className="absolute -top-[2px] -left-[2px] w-5 h-5 border-t-4 border-l-4 border-[#00fbfb]"></div>
        <div className="absolute -top-[2px] -right-[2px] w-5 h-5 border-t-4 border-r-4 border-[#00fbfb]"></div>
        <div className="absolute -bottom-[2px] -left-[2px] w-5 h-5 border-b-4 border-l-4 border-[#00fbfb]"></div>
        <div className="absolute -bottom-[2px] -right-[2px] w-5 h-5 border-b-4 border-r-4 border-[#00fbfb]"></div>

        <div className="hud-scanlines" aria-hidden="true"></div>

        {children}
      </div>

      <MenuFooter />
    </div>
  );
}
