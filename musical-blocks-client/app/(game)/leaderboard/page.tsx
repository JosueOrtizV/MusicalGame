'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/src/stores/gameStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { fetchTopScores, fetchTopByDifficulty, LeaderboardEntry } from '@/src/lib/supabase/leaderboard';
import { TrophyIcon, BackArrowIcon, MusicIcon } from '@/src/components/ui/Icons';
import { FloatingMusicNotes } from '@/src/components/ui/FloatingMusicNotes';
import { MenuFooter } from '@/src/components/ui/MenuFooter';

type DiffFilter = 'all' | 'easy' | 'normal' | 'hard' | 'expert';

export default function LeaderboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const lang = useGameStore((s) => s.language);
  const spPlayerId = useGameStore((s) => s.spPlayerId);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<DiffFilter>('all');
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);

  // Load scores
  useEffect(() => {
    async function loadScores() {
      setLoading(true);
      try {
        let data: LeaderboardEntry[] = [];
        if (activeFilter === 'all') {
          data = await fetchTopScores(50);
        } else {
          data = await fetchTopByDifficulty(activeFilter, 50);
        }
        setLeaderboard(data);
      } catch (err) {
        console.error('[Leaderboard] Error loading scores:', err);
      } finally {
        setLoading(false);
      }
    }
    loadScores();
  }, [activeFilter]);

  return (
    <main
      id="game-app"
      className="relative min-h-[100dvh] overflow-y-auto flex flex-col justify-start md:justify-center items-center bg-[#1c0f1a] text-[#f4dcec] p-4 pt-14 md:pt-8 pb-28 md:pb-8 select-none"
    >
      <FloatingMusicNotes />

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

        .start-container {
          width: 100%;
          max-width: 680px;
          padding: 56px 16px 24px 16px;
        }

        @media (min-width: 768px) {
          .start-container {
            width: 100%;
            padding: 56px 48px 32px 48px;
            margin-left: auto;
            margin-right: auto;
          }
        }

        /* Leaderboard table custom scroll */
        .leaderboard-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .leaderboard-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .leaderboard-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 171, 243, 0.4);
          border-radius: 4px;
        }
        .leaderboard-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 171, 243, 0.7);
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

      {/* Main Card Container */}
      <div className="relative bg-[#160a15] border-2 border-[#00fbfb]/30 shadow-[0_0_50px_rgba(0,251,251,0.1)] z-[60] start-container flex flex-col max-h-[calc(100dvh-130px)] md:max-h-none overflow-hidden">

        {/* Back Button */}
        <button
          className="absolute top-5 left-5 text-[#00fbfb] font-retro text-xs md:text-sm font-bold uppercase tracking-widest bg-transparent border-none p-0 cursor-pointer z-20 flex items-center gap-2 hover:text-[#ffabf3] transition-all duration-300 group hover:drop-shadow-[0_0_8px_rgba(255,171,243,0.8)]"
          onClick={() => router.push('/singleplayer')}
        >
          <BackArrowIcon size={20} className="group-hover:-translate-x-1 transition-transform text-glow-cyan" />
          <span>{t('back').replace('← ', '')}</span>
        </button>

        {/* Help Tooltip Button */}
        <div className="absolute top-5 right-5 z-20 group/tooltip">
          <button
            type="button"
            className="w-6 h-6 rounded-full border border-[#ffabf3]/40 flex items-center justify-center text-xs text-[#ffabf3]/60 hover:text-[#ffabf3] hover:border-[#ffabf3] font-mono font-bold cursor-help transition-all"
          >
            ?
          </button>
          <div className="absolute right-0 top-7 w-64 bg-[#120811] border border-[#ffabf3]/30 p-3 rounded shadow-2xl z-50 text-[10px] font-mono text-left text-white/90 hidden group-hover/tooltip:block pointer-events-none">
            <p className="text-[#ffabf3] font-bold mb-1.5 uppercase tracking-wider">
              {lang === 'es' ? 'MULTIPLICADORES DE PUNTOS' : 'SCORE MULTIPLIERS'}
            </p>
            <p className="mb-1.5 border-b border-white/10 pb-1 text-[#00fbfb]">
              {lang === 'es' ? 'Fórmula: (Ronda × 10) × Mults' : 'Formula: (Round × 10) × Mults'}
            </p>
            <div className="space-y-1">
              <div>
                <span className="text-fuchsia-400 font-bold">{lang === 'es' ? 'Colores: ' : 'Colors: '}</span>
                <span>4 (1.0x) • 6 (1.5x) • 8 (2.0x) • 10 (3.0x)</span>
              </div>
              <div>
                <span className="text-fuchsia-400 font-bold">{lang === 'es' ? 'Velocidad: ' : 'Speed: '}</span>
                <span>Chill (0.8x) • Normal (1.0x) • Turbo (2.0x)</span>
              </div>
              <div>
                <span className="text-fuchsia-400 font-bold">{lang === 'es' ? 'Vidas: ' : 'Lives: '}</span>
                <span>1 (1.5x) • 2 (1.2x) • 3 (1.0x) • 4 (0.9x) • 5 (0.8x)</span>
              </div>
              <div>
                <span className="text-fuchsia-400 font-bold">{lang === 'es' ? 'Muerte Súbita: ' : 'Sudden Death: '}</span>
                <span>Off (0.5x) • Normal (1.0x) • Chaos (2.0x)</span>
              </div>
              <div>
                <span className="text-fuchsia-400 font-bold">{lang === 'es' ? 'Modo Ciego: ' : 'Blind Mode: '}</span>
                <span>{lang === 'es' ? 'Activo (2.0x)' : 'Active (2.0x)'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Corner Brackets */}
        <div className="absolute -top-[2px] -left-[2px] w-5 h-5 border-t-4 border-l-4 border-[#00fbfb]"></div>
        <div className="absolute -top-[2px] -right-[2px] w-5 h-5 border-t-4 border-r-4 border-[#00fbfb]"></div>
        <div className="absolute -bottom-[2px] -left-[2px] w-5 h-5 border-b-4 border-l-4 border-[#00fbfb]"></div>
        <div className="absolute -bottom-[2px] -right-[2px] w-5 h-5 border-b-4 border-r-4 border-[#00fbfb]"></div>

        {/* Logo / Header */}
        <div className="text-center mt-2 mb-6 w-full">
          <div className="flex items-center justify-center gap-1.5 mb-1 opacity-60">
            <MusicIcon size={12} className="text-[#ffabf3] pixel-note" />
            <span className="font-display text-[9px] tracking-[0.3em] text-[#f4dcec] uppercase">
              Voxel Rave
            </span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl text-[#ffabf3] tracking-[0.2em] uppercase mb-1 text-glow-magenta flex items-center justify-center gap-3">
            <TrophyIcon size={28} className="text-[#eaea00] text-glow-cyan" />
            {t('globalLeaderboard')}
          </h1>
          <p className="font-mono text-[10px] text-[#00fbfb]/60 uppercase tracking-widest">
            {lang === 'es' ? 'TOP 50 JUGADORES MUNDIALES' : 'TOP 50 WORLD RANKINGS'}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 justify-center mb-6 p-1 bg-black/40 rounded-lg border border-white/5">
          {(['all', 'easy', 'normal', 'hard', 'expert'] as const).map((filter) => {
            const filterLabels: Record<DiffFilter, string> = {
              all: lang === 'es' ? 'Todos' : 'All',
              easy: lang === 'es' ? 'Fácil' : 'Easy',
              normal: lang === 'es' ? 'Normal' : 'Medium',
              hard: lang === 'es' ? 'Difícil' : 'Hard',
              expert: lang === 'es' ? 'Experto' : 'Expert',
            };
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                className={`py-1.5 px-3 font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all rounded-md ${isActive
                    ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-400/30 text-shadow-[0_0_8px_rgba(0,243,255,0.4)]'
                    : 'text-neutral-400 border border-transparent hover:bg-white/5 hover:text-white'
                  }`}
                onClick={() => setActiveFilter(filter)}
              >
                {filterLabels[filter]}
              </button>
            );
          })}
        </div>

        {/* Leaderboard Table List */}
        <div className="flex-1 overflow-y-auto leaderboard-scroll pr-2 flex flex-col gap-1 w-full min-h-[150px] max-h-[360px] md:max-h-[460px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-[#00fbfb] border-t-transparent rounded-full animate-spin"></div>
              <p className="font-mono text-xs text-[#00fbfb]/60 text-center animate-pulse">{t('leaderboardLoading')}</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="font-mono text-xs text-white/40 text-center py-16">
              {lang === 'es' ? 'No hay récords registrados todavía.' : 'No records yet in this difficulty.'}
            </p>
          ) : (
            leaderboard.map((entry, index) => {
              const isRank1 = index === 0;
              const isRank2 = index === 1;
              const isRank3 = index === 2;
              const isCurrentUser = entry.player_id === spPlayerId;

              // Format date
              const dateStr = entry.created_at
                ? new Date(entry.created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                })
                : '';

              return (
                <div
                  key={entry.id}
                  className={`flex justify-between items-center text-xs font-mono border transition-all cursor-pointer ${isCurrentUser
                      ? 'bg-[#00fbfb]/15 border-[#00fbfb]/40 rounded hover:border-[#00fbfb] shadow-[0_0_10px_rgba(0,251,251,0.1)]'
                      : 'bg-white/[0.01] hover:bg-white/[0.04] border-white/5 hover:border-cyan-400/30 rounded-sm'
                    }`}
                  style={{ padding: '10px 14px' }}
                  onClick={() => setSelectedEntry(entry)}
                >
                  {/* Left Side: Rank + Name + Difficulty Tags */}
                  <div className="flex items-center gap-3 overflow-hidden text-ellipsis whitespace-nowrap max-w-[70%]">
                    <span
                      className={`w-6 text-center font-bold font-display ${isRank1 ? 'text-[#eaea00] text-glow-cyan' : isRank2 ? 'text-[#cbd5e1]' : isRank3 ? 'text-[#b45309]' : 'text-white/40'
                        }`}
                    >
                      {index + 1}
                    </span>
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className={`font-bold truncate ${isCurrentUser ? 'text-[#00fbfb]' : 'text-white/90'}`}>
                        {entry.name}
                      </span>
                      <span className="text-[8px] text-white/40 uppercase tracking-wider flex items-center gap-1">
                        <span>{lang === 'es' ? `Ronda ${entry.rounds}` : `Round ${entry.rounds}`}</span>

                        <span className="hidden sm:inline">•</span>
                        <span 
                          className="font-semibold hidden sm:inline"
                          style={{
                            color: entry.difficulty === 'easy' ? '#22c55e' :
                                   entry.difficulty === 'normal' ? '#00fbfb' :
                                   entry.difficulty === 'hard' ? '#eab308' :
                                   entry.difficulty === 'expert' ? '#ef4444' : 'inherit'
                          }}
                        >
                          {entry.difficulty === 'easy' ? (lang === 'es' ? '4 Colores' : '4 Colors') :
                            entry.difficulty === 'normal' ? (lang === 'es' ? '6 Colores' : '6 Colors') :
                              entry.difficulty === 'hard' ? (lang === 'es' ? '8 Colores' : '8 Colors') :
                                entry.difficulty === 'expert' ? (lang === 'es' ? '10 Colores' : '10 Colors') :
                                  entry.difficulty}
                        </span>

                        <span>•</span>
                        <span 
                          className="font-semibold"
                          style={{
                            color: entry.speed === 'CHILL' ? '#38bdf8' :
                                   entry.speed === 'NORMAL' ? '#3b82f6' :
                                   entry.speed === 'TURBO' ? '#eab308' : 'inherit'
                          }}
                        >
                          {entry.speed === 'CHILL' ? 'Chill' :
                            entry.speed === 'NORMAL' ? 'Normal' :
                              entry.speed === 'TURBO' ? 'Turbo' :
                                entry.speed}
                        </span>

                        {dateStr && (
                          <>
                            <span>•</span>
                            <span className="hidden xs:inline">{dateStr}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Score */}
                  <span
                    className={`font-bold font-display text-sm ${isRank1 ? 'text-[#eaea00] text-glow-cyan' : 'text-[#ffabf3]'
                      }`}
                  >
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info message */}
        <div className="mt-4 pt-3 border-t border-white/10 text-center flex-shrink-0">
          <p className="font-mono text-[8px] md:text-[9px] text-[#ffabf3]/50 uppercase tracking-widest">
            {lang === 'es' ? 'Toca cualquier fila para ver el desglose' : 'Tap any row to view full details'}
          </p>
        </div>

      </div>

      {/* Detail Popup Modal */}
      {selectedEntry && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[20000] flex items-center justify-center p-4"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="bg-[#1b0a1a] border-2 border-[#ffabf3] p-6 w-full max-w-xs rounded relative shadow-[0_0_30px_rgba(255,171,243,0.3)] animate-[modal-glow-fade_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent corners */}
            <div className="absolute -top-[2px] -left-[2px] w-4 h-4 border-t-2 border-l-2 border-[#ffabf3]"></div>
            <div className="absolute -top-[2px] -right-[2px] w-4 h-4 border-t-2 border-r-2 border-[#ffabf3]"></div>
            <div className="absolute -bottom-[2px] -left-[2px] w-4 h-4 border-b-2 border-l-2 border-[#ffabf3]"></div>
            <div className="absolute -bottom-[2px] -right-[2px] w-4 h-4 border-b-2 border-r-2 border-[#ffabf3]"></div>

            <button
              className="absolute top-3 right-3 text-[#ffabf3]/60 hover:text-[#ffabf3] font-mono text-xs cursor-pointer bg-none border-none p-1"
              style={{ border: 'none', background: 'none' }}
              onClick={() => setSelectedEntry(null)}
            >
              [X]
            </button>

            <div className="text-center">
              <TrophyIcon size={32} className="text-[#eaea00] mx-auto mb-2 text-glow-cyan" />
              <h3 className="font-display text-sm text-[#ffabf3] uppercase tracking-wider mb-1 truncate">
                {selectedEntry.name}
              </h3>
              <p className="font-mono text-xl font-bold text-[#00fbfb] text-glow-cyan mb-4">
                {selectedEntry.score.toLocaleString()} pts
              </p>

              <div className="border-t border-white/10 pt-4 flex flex-col gap-2 font-mono text-[10px] text-left">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-white/50">{lang === 'es' ? 'Ronda Alcanzada:' : 'Round Reached:'}</span>
                  <span className="text-white font-bold">{selectedEntry.rounds}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-white/50">{lang === 'es' ? 'Dificultad (Colores):' : 'Difficulty (Colors):'}</span>
                  <span 
                    className="font-bold"
                    style={{
                      color: selectedEntry.difficulty === 'easy' ? '#22c55e' :
                             selectedEntry.difficulty === 'normal' ? '#00fbfb' :
                             selectedEntry.difficulty === 'hard' ? '#eab308' :
                             selectedEntry.difficulty === 'expert' ? '#ef4444' : '#ffffff'
                    }}
                  >
                    {selectedEntry.difficulty === 'easy' ? (lang === 'es' ? '4 Colores (Fácil)' : '4 Colors (Easy)') :
                      selectedEntry.difficulty === 'normal' ? (lang === 'es' ? '6 Colores (Normal)' : '6 Colors (Normal)') :
                        selectedEntry.difficulty === 'hard' ? (lang === 'es' ? '8 Colores (Difícil)' : '8 Colors (Hard)') :
                          selectedEntry.difficulty === 'expert' ? (lang === 'es' ? '10 Colores (Experto)' : '10 Colors (Expert)') :
                            selectedEntry.difficulty}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-white/50">{lang === 'es' ? 'Velocidad:' : 'Speed:'}</span>
                  <span 
                    className="font-bold"
                    style={{
                      color: selectedEntry.speed === 'CHILL' ? '#38bdf8' :
                             selectedEntry.speed === 'NORMAL' ? '#3b82f6' :
                             selectedEntry.speed === 'TURBO' ? '#eab308' : '#ffffff'
                    }}
                  >
                    {selectedEntry.speed === 'CHILL' ? (lang === 'es' ? 'Chill (0.8x)' : 'Chill (0.8x)') :
                      selectedEntry.speed === 'NORMAL' ? (lang === 'es' ? 'Normal (1.0x)' : 'Normal (1.0x)') :
                        selectedEntry.speed === 'TURBO' ? (lang === 'es' ? 'Turbo (2.0x)' : 'Turbo (2.0x)') :
                          selectedEntry.speed}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-white/50">{lang === 'es' ? 'Vidas Iniciales:' : 'Starting Lives:'}</span>
                  <span className="text-[#f43f5e] font-bold">{selectedEntry.max_lives ?? 3}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-white/50">{lang === 'es' ? 'Muerte Súbita:' : 'Sudden Death:'}</span>
                  <span 
                    className="font-bold"
                    style={{
                      color: selectedEntry.sudden_death === 'OFF' ? '#10b981' :
                             selectedEntry.sudden_death === 'CHAOS' ? '#f43f5e' : '#3b82f6'
                    }}
                  >
                    {selectedEntry.sudden_death === 'OFF' ? (lang === 'es' ? 'Desactivado' : 'Off') :
                     selectedEntry.sudden_death === 'CHAOS' ? (lang === 'es' ? 'Caos' : 'Chaos') :
                     (lang === 'es' ? 'Normal' : 'Normal')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-white/50">{lang === 'es' ? 'Modo Ciego:' : 'Blind Mode:'}</span>
                  <span 
                    className="font-bold"
                    style={{
                      color: selectedEntry.blind_mode ? '#d946ef' : 'rgba(220, 190, 212, 0.4)'
                    }}
                  >
                    {selectedEntry.blind_mode ? (lang === 'es' ? 'Activo' : 'Active') : (lang === 'es' ? 'Inactivo' : 'Inactive')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">{lang === 'es' ? 'Fecha de Registro:' : 'Date:'}</span>
                  <span className="text-white/80 text-[9px] truncate">
                    {selectedEntry.created_at
                      ? new Date(selectedEntry.created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <button
                className="mt-6 w-full py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-[#ffabf3]/30 text-[#ffabf3] hover:bg-[#ffabf3]/10 font-mono text-[10px] uppercase tracking-wider rounded transition-all cursor-pointer"
                style={{ background: 'none' }}
                onClick={() => setSelectedEntry(null)}
              >
                {lang === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MenuFooter />
    </main>
  );
}
