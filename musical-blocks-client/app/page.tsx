'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/src/stores/gameStore';
import { getSocket } from '@/src/lib/socketClient';
import { useTranslation } from '@/src/hooks/useTranslation';
import { MusicIcon, UserIcon, UsersIcon, TrophyIcon } from '@/src/components/ui/Icons';
import { SettingsMenu } from '@/src/components/ui/SettingsMenu';
import { MenuFooter } from '@/src/components/ui/MenuFooter';
import { FloatingMusicNotes } from '@/src/components/ui/FloatingMusicNotes';

// ---------------------------------------------------------------------------
//  Home — Mode selection screen (Singleplayer vs Multiplayer)
//  Styled to match the Stitch design specifications perfectly.
// ---------------------------------------------------------------------------
export default function Home() {
  const store = useGameStore();
  const router = useRouter();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean up any stale multiplayer rooms if user navigated back to Home
  useEffect(() => {
    const currentState = useGameStore.getState();
    if (currentState.room) {
      getSocket().emit('room:leave');
      currentState.clearRoom();
    }
  }, []);

  // Parallax mouse effect for immersive arcade look
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
      const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
      containerRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Reset game mode to multiplayer on mount so that returning from single player reconnects the socket
  useEffect(() => {
    useGameStore.getState().setGameMode('multiplayer');
  }, []);

  return (
    <main
      id="game-app"
      className="relative h-[100dvh] overflow-y-auto flex flex-col justify-start md:justify-center items-center bg-[#1c0f1a] text-[#f4dcec] p-4 pt-18 md:pt-0 pb-28 md:pb-4 select-none"
    >
      <FloatingMusicNotes />
      <SettingsMenu />

      {/* Custom styles for animations and shadows */}
      <style>{`
        .scanline-overlay {
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%,
            rgba(0, 0, 0, 0.15) 50%
          );
          background-size: 100% 4px;
          pointer-events: none;
        }

        .text-glow-cyan {
          text-shadow: 0 0 10px rgba(0, 251, 251, 0.8);
        }

        .text-glow-magenta {
          text-shadow: 0 0 10px rgba(255, 0, 255, 0.8);
        }

        .glitch-anim:hover {
          animation: glitch 0.3s cubic-bezier(.25,.46,.45,.94) both infinite;
        }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }

        .pixel-note {
          filter: drop-shadow(0 0 8px rgba(255, 171, 243, 0.8));
        }

        .start-container {
          width: 100%;
          max-width: 640px;
          padding: 56px 16px 24px 16px;
          animation: border-trace 3s ease-in-out infinite;
        }

        .header-section {
          margin-bottom: 32px;
        }

        .footer-section {
          margin-top: 32px;
        }

        @media (min-width: 768px) {
          .start-container {
            width: 100%;
            padding: 56px 48px 24px 48px;
            margin-left: auto;
            margin-right: auto;
          }
          .header-section {
            margin-bottom: 60px;
          }
          .footer-section {
            margin-top: 80px;
          }
        }

        .noise-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 40;
          opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* CRT Scanlines */}
      <div className="fixed inset-0 scanline-overlay z-50"></div>

      {/* Noise overlay */}
      <div className="noise-bg" aria-hidden="true"></div>

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

      {/* Main Start Screen Container */}
      <div
        ref={containerRef}
        className="relative bg-[#160a15] border-2 border-[#00fbfb]/30 shadow-[0_0_50px_rgba(0,251,251,0.1)] group z-[60] transition-transform duration-100 ease-out start-container"
      >
        {/* Corner Brackets */}
        <div className="absolute -top-[2px] -left-[2px] w-5 h-5 border-t-4 border-l-4 border-[#00fbfb] group-hover:scale-110 transition-transform"></div>
        <div className="absolute -top-[2px] -right-[2px] w-5 h-5 border-t-4 border-r-4 border-[#00fbfb] group-hover:scale-110 transition-transform"></div>
        <div className="absolute -bottom-[2px] -left-[2px] w-5 h-5 border-b-4 border-l-4 border-[#00fbfb] group-hover:scale-110 transition-transform"></div>
        <div className="absolute -bottom-[2px] -right-[2px] w-5 h-5 border-b-4 border-r-4 border-[#00fbfb] group-hover:scale-110 transition-transform"></div>

        {/* Header Section */}
        <div className="text-center relative header-section">
          {/* Floating animated music notes */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4" style={{ top: '-36px' }}>
            <MusicIcon size={36} className="text-[#ffabf3] pixel-note animate-bounce" />
            <MusicIcon size={24} className="text-[#00fbfb] pixel-note animate-pulse" />
          </div>

          {/* Gradient Title */}
          <h1 className="font-sans text-5xl md:text-7xl font-bold tracking-tighter italic mt-4 drop-shadow-[0_0_20px_rgba(255,0,255,0.4)]">
            <span className="w-full inline-block pr-4 bg-gradient-to-r from-[#00fbfb] via-[#ffabf3] to-[#cdcd00] bg-clip-text text-transparent">
              {t('gameTitle')}
            </span>
          </h1>
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-[#dcbed4] opacity-60 mt-2">
            Party Game
          </p>

          {/* Divider and Subtitle */}
          <div className="pt-8 border-t border-[#564052]/20" style={{ maxWidth: '240px', marginLeft: 'auto', marginRight: 'auto', marginTop: '16px' }}>
            <h2
              className="font-sans text-2xl md:text-3xl text-glow-cyan uppercase tracking-widest italic glitch-anim leading-tight"
              style={{ color: '#ffffff', textAlign: 'center' }}
            >
              {t('modeSelectTitle')}
            </h2>
          </div>
        </div>

        {/* Game Modes options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>

          {/* Single Player Card */}
          <button
            className="relative w-full group/btn overflow-hidden transition-all duration-300 transform hover:scale-[1.02] active:scale-95 rounded border border-[#00c3ff]/30 hover:border-[#00c3ff]/70 cursor-pointer flex flex-row items-stretch min-h-[100px] shadow-[0_0_15px_rgba(0,195,255,0.25)] hover:shadow-[0_0_25px_rgba(0,195,255,0.6)]"
            style={{ maxWidth: '440px', margin: '0 auto', display: 'flex' }}
            onClick={() => {
              store.setGameMode('singleplayer');
              router.push('/singleplayer');
            }}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#00c3ff] to-[#3a00ff] opacity-90 group-hover/btn:opacity-100 group-hover/btn:brightness-110 transition-all duration-300 z-0"></div>

            {/* Subtle Card Scanlines Overlay */}
            <div className="absolute inset-0 pointer-events-none z-0 mix-blend-overlay" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)'
            }}></div>

            {/* Icon Box (Full height, glued to left edge) - Centered */}
            <div className="relative z-10 bg-black/30 flex flex-row items-center justify-center shrink-0 border-r border-[#00c3ff]/30 group-hover/btn:border-[#00c3ff]/70 transition-colors duration-300 px-0 w-[72px]">
              <UserIcon size={32} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] group-hover/btn:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-300" />
            </div>

            {/* Text Box */}
            <div
              className="relative z-10 flex flex-col items-start justify-center grow text-left"
              style={{ padding: '16px 20px 16px 40px' }}
            >
              <div className="flex flex-row flex-wrap items-center gap-3 w-full">
                <h3 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-all duration-300">
                  {t('singlePlayer')}
                </h3>
                {store.spHighScore > 0 && (
                  <div className="inline-flex items-center gap-1.5 bg-[#eaea00] px-2 py-0.5 rounded-sm text-[#1d1d00] text-[10px] sm:text-xs font-mono font-bold shadow-[0_0_10px_rgba(234,234,0,0.4)] border border-[#1d1d00]/10">
                    <TrophyIcon size={12} className="text-[#1d1d00]" />
                    <span>{t('highScore')}: {store.spHighScore} pts</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-white/90 italic font-medium mt-1 drop-shadow-sm">
                {t('singlePlayerDesc')}
              </p>
            </div>
          </button>

          {/* Multiplayer Card */}
          <button
            className="relative w-full group/btn overflow-hidden transition-all duration-300 transform hover:scale-[1.02] active:scale-95 rounded border border-[#d900ff]/30 hover:border-[#d900ff]/70 cursor-pointer flex flex-row items-stretch min-h-[100px] shadow-[0_0_15px_rgba(217,0,255,0.25)] hover:shadow-[0_0_25px_rgba(217,0,255,0.6)]"
            style={{ maxWidth: '440px', margin: '0 auto', display: 'flex' }}
            onClick={() => {
              store.setGameMode('multiplayer');
              router.push('/multiplayer');
            }}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#d900ff] to-[#5900ff] opacity-90 group-hover/btn:opacity-100 group-hover/btn:brightness-110 transition-all duration-300 z-0"></div>

            {/* Subtle Card Scanlines Overlay */}
            <div className="absolute inset-0 pointer-events-none z-0 mix-blend-overlay" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)'
            }}></div>

            {/* Icon Box (Full height, glued to left edge) - Centered */}
            <div className="relative z-10 bg-black/30 flex flex-row items-center justify-center shrink-0 border-r border-[#d900ff]/30 group-hover/btn:border-[#d900ff]/70 transition-colors duration-300 px-0 w-[72px]">
              <UsersIcon size={32} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] group-hover/btn:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-300" />
            </div>

            {/* Text Box */}
            <div
              className="relative z-10 flex flex-col items-start justify-center grow text-left"
              style={{ padding: '16px 20px 16px 40px' }}
            >
              <h3 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-all duration-300">
                {t('multiplayer')}
              </h3>
              <p className="text-sm text-white/90 italic font-medium mt-1 drop-shadow-sm">
                {t('multiplayerDesc')}
              </p>
            </div>
          </button>
        </div>
      </div>
      <MenuFooter />
    </main>
  );
}
