'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useGameStore } from '@/src/stores/gameStore';

export function MenuFooter() {
  const { t } = useTranslation();
  
  const isOnline = useGameStore((s) => s.isConnected);
  const latency = useGameStore((s) => s.latency);
  const gameMode = useGameStore((s) => s.gameMode);

  return (
    <footer className="fixed bottom-0 left-0 right-0 py-3 md:py-4 px-6 md:px-12 bg-black/75 border-t border-[#ffabf3]/10 backdrop-blur-md z-[100] flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 text-[10px] font-mono uppercase tracking-widest text-[#dcbed4]/60">
      {/* Left section: Server and latency (or Local Mode) */}
      {gameMode === 'multiplayer' ? (
        <div className="flex justify-center sm:justify-start gap-4 sm:gap-6 w-full sm:w-auto">
          <span className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-[#00fbfb] animate-pulse shadow-[0_0_8px_rgba(0,251,251,0.8)]' : 'bg-red-500'}`}></span>
            <span>{t('serverStatus')}: <span className={isOnline ? 'text-[#00fbfb] font-bold' : 'text-red-500 font-bold'}>{isOnline ? t('online') : t('offline')}</span></span>
          </span>
          <span className={isOnline ? 'text-[#00fbfb]/70' : 'text-red-500/70'}>{t('latency')}: {isOnline ? latency : 0}ms</span>
        </div>
      ) : (
        <div className="flex justify-center sm:justify-start gap-4 sm:gap-6 w-full sm:w-auto">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#dcbed4]/30"></span>
            <span className="text-[#dcbed4]/50">{t('localMode')}</span>
          </span>
        </div>
      )}

      {/* Middle section: System details */}
      <div className="hidden lg:block text-[#dcbed4]/40">
        Ver: 1.0.0 // Build: 0x9a4f // {t('systemStatus')}: <span className="text-[#00fbfb]">{t('nominal')}</span>
      </div>

      {/* Right section: Links */}
      <div className="flex justify-center sm:justify-end gap-6 w-full sm:w-auto">
        <Link 
          href="/privacy" 
          className="hover:text-[#ffabf3] hover:drop-shadow-[0_0_5px_rgba(255,171,243,0.8)] transition-all duration-300 cursor-pointer"
        >
          {t('privacyProtocol').replace(/ /g, '_')}
        </Link>
        <Link 
          href="/terms" 
          className="hover:text-[#ffabf3] hover:drop-shadow-[0_0_5px_rgba(255,171,243,0.8)] transition-all duration-300 cursor-pointer"
        >
          {t('termsOfService').replace(/ /g, '_')}
        </Link>
      </div>
    </footer>
  );
}
