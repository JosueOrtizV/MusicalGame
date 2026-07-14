'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/src/stores/gameStore';
import { useToastStore } from '@/src/stores/toastStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PlayerMesh } from '../canvas/PlayerMesh';
import { PLAYER_COLORS, PlayerCosmetics, Player, RoomSettings } from '@/src/shared/types';
import { 
  MusicIcon, 
  TrophyIcon, 
  PlayArrowIcon, 
  BackArrowIcon, 
  ShirtIcon, 
  PaletteIcon, 
  JoystickIcon,
  SnowflakeIcon,
  LightningIcon,
  StopwatchIcon,
  HeartIcon,
  GlassesIcon,
  SkullIcon,
  DoveIcon
} from './Icons';
import { FloatingMusicNotes } from './FloatingMusicNotes';
import { MenuFooter } from './MenuFooter';
import { fetchTopScores, LeaderboardEntry } from '@/src/lib/supabase/leaderboard';

// ---------------------------------------------------------------------------
//  SinglePlayerConfig Screen
// ---------------------------------------------------------------------------

// Cyberpunk descriptive color names dictionary for premium tooltips
const COLOR_NAMES_ES: Record<string, string> = {
  '#F6E05E': 'Amarillo Cyber',
  '#FC8181': 'Rojo Neón',
  '#68D391': 'Verde Esmeralda',
  '#76E4F7': 'Cian Holograma',
  '#B794F4': 'Púrpura Synth',
  '#FBD38D': 'Naranja Sol',
  '#F687B3': 'Rosa Chicle',
  '#90CDF4': 'Azul Cielo',
  '#39FF14': 'Verde Lima',
  '#FF007F': 'Fucsia Electra',
  '#0066FF': 'Azul Eléctrico',
  '#FF5500': 'Coral Fuego',
};

const COLOR_NAMES_EN: Record<string, string> = {
  '#F6E05E': 'Cyber Yellow',
  '#FC8181': 'Neon Red',
  '#68D391': 'Emerald Green',
  '#76E4F7': 'Hologram Cyan',
  '#B794F4': 'Synth Purple',
  '#FBD38D': 'Sunset Orange',
  '#F687B3': 'Bubblegum Pink',
  '#90CDF4': 'Sky Blue',
  '#39FF14': 'Lima Green',
  '#FF007F': 'Electra Fuchsia',
  '#0066FF': 'Electric Blue',
  '#FF5500': 'Fire Coral',
};

const getColorName = (hex: string, lang: 'en' | 'es') => {
  const upperHex = hex.toUpperCase();
  return lang === 'es' ? (COLOR_NAMES_ES[upperHex] || hex) : (COLOR_NAMES_EN[upperHex] || hex);
};

// ---------------------------------------------------------------------------
//  SinglePlayerConfig — config screen for single player (used at /singleplayer)
// ---------------------------------------------------------------------------
export function SinglePlayerConfig() {
  const store = useGameStore();
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [name, setName] = useState(store.localPlayerName || '');
  const addToast = useToastStore((s) => s.addToast);

  const spSettings = store.spSettings;
  const setSpSettings = store.setSpSettings;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState<RoomSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'difficulty' | 'speed' | 'lives' | 'modifiers'>('difficulty');
  const [isSdExpanded, setIsSdExpanded] = useState(false);

  const spDifficulty = useMemo<'easy' | 'normal' | 'hard' | 'extreme'>(() => {
    if (spSettings.maxColors === 4) return 'easy';
    if (spSettings.maxColors === 8) return 'hard';
    if (spSettings.maxColors === 10) return 'extreme';
    return 'normal';
  }, [spSettings.maxColors]);

  const setSpDifficulty = (diff: 'easy' | 'normal' | 'hard' | 'extreme') => {
    let colors = 6;
    if (diff === 'easy') colors = 4;
    else if (diff === 'normal') colors = 6;
    else if (diff === 'hard') colors = 8;
    else if (diff === 'extreme') colors = 10;
    setSpSettings({ ...spSettings, maxColors: colors });
  };

  const spSpeed = spSettings.gameSpeed || 'NORMAL';
  const setSpSpeed = (speed: 'CHILL' | 'NORMAL' | 'TURBO') => {
    setSpSettings({ ...spSettings, gameSpeed: speed });
  };

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  // Locker states & methods
  const [isLockerOpen, setIsLockerOpen] = useState(false);
  const [draftCosmetics, setDraftCosmetics] = useState<PlayerCosmetics | null>(null);
  const [lockerTab, setLockerTab] = useState<'equip' | 'colors' | 'anims'>('equip');
  const [previewAnimType, setPreviewAnimType] = useState<'dance' | 'idle' | 'celebrate' | null>(null);

  const localCosmetics = useGameStore((s) => s.localCosmetics);
  const updateLocalCosmetics = useGameStore((s) => s.updateLocalCosmetics);

  const openLocker = () => {
    setDraftCosmetics(localCosmetics);
    setIsLockerOpen(true);
    setPreviewAnimType(null);
  };

  const saveLocker = () => {
    if (draftCosmetics) {
      updateLocalCosmetics(draftCosmetics);
      addToast(
        lang === 'es'
          ? '¡Estilo guardado y sincronizado!'
          : 'Style saved and synchronized!',
        'success'
      );
    }
    setIsLockerOpen(false);
    setDraftCosmetics(null);
  };

  const cancelLocker = () => {
    setIsLockerOpen(false);
    setDraftCosmetics(null);
  };

  const updateDraftCosmetics = (newFields: Partial<PlayerCosmetics>) => {
    setDraftCosmetics((prev) => (prev ? { ...prev, ...newFields } : null));
  };

  const openSettings = () => {
    setDraftSettings({ ...spSettings });
    setIsSettingsOpen(true);
  };

  const saveSettings = () => {
    if (draftSettings) {
      setSpSettings({ ...draftSettings });
      addToast(
        lang === 'es'
          ? '¡Ajustes de partida actualizados!'
          : 'Match settings updated!',
        'success'
      );
    }
    setIsSettingsOpen(false);
    setDraftSettings(null);
  };

  const cancelSettings = () => {
    setIsSettingsOpen(false);
    setDraftSettings(null);
  };

  const updateDraftSettings = (newFields: Partial<RoomSettings>) => {
    setDraftSettings((prev) => {
      const current = prev || spSettings;
      return { ...current, ...newFields };
    });
  };

  // Handle Escape key to close locker and settings modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLockerOpen) {
          cancelLocker();
        } else if (isSettingsOpen) {
          cancelSettings();
        }
      }
    };
    if (isLockerOpen || isSettingsOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLockerOpen, isSettingsOpen, draftCosmetics, draftSettings]);

  const previewPlayer = useMemo<Player>(() => {
    const activeCosmetics = isLockerOpen && draftCosmetics ? draftCosmetics : localCosmetics;
    return {
      id: 'preview-id',
      name: name.trim() || store.localPlayerName || 'Player',
      color: activeCosmetics.primaryColor || '#F687B3',
      cosmetics: activeCosmetics,
      isAlive: true,
      isHost: true,
      isReady: true,
      score: 0,
      hasReturnedToLobby: true,
      position: { x: 0, z: 0 },
      lives: 3
    };
  }, [name, store.localPlayerName, isLockerOpen, draftCosmetics, localCosmetics]);

  useEffect(() => {
    const currentState = useGameStore.getState();
    currentState.setGameMode('singleplayer');
    if (currentState.room) {
      // Need dynamic import to avoid breaking anything if socketClient isn't loaded yet,
      // or just import it at the top. Let's just clear the room state. The useSocket hook
      // will disconnect the socket anyway since gameMode is 'singleplayer', which cleans up the server side!
      currentState.clearRoom();
    }
  }, []);

  const [prevStoreName, setPrevStoreName] = useState(store.localPlayerName);

  // Sync name input when store hydrates (adjusting state during render)
  if (store.localPlayerName !== prevStoreName) {
    setPrevStoreName(store.localPlayerName);
    setName(store.localPlayerName || '');
  }

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      setLoadingLeaderboard(true);
      fetchTopScores(5).then((data) => {
        if (active) {
          setLeaderboard(data);
          setLoadingLeaderboard(false);
        }
      }).catch((e) => {
        console.error(e);
        if (active) {
          setLoadingLeaderboard(false);
        }
      });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const nameValid = name.trim().length >= 2 && name.trim().length <= 16;

  const validateName = () => {
    if (name.trim().length === 0) {
      addToast(t('errNameFirst'), 'error');
      return false;
    }
    if (!nameValid) {
      addToast(t('errNameLength'), 'error');
      return false;
    }
    return true;
  };

  return (
    <>
      {/* Leaderboard Toggle Button (Top Right, next to settings gear) */}
      <div className="leaderboard-btn-container">
        <button
          className="leaderboard-toggle-btn"
          onClick={() => setIsLeaderboardOpen(true)}
          title={t('globalLeaderboard')}
          aria-label={t('globalLeaderboard')}
        >
          <TrophyIcon size={18} />
        </button>
      </div>

      <FloatingMusicNotes />

      <div className="relative h-[100dvh] overflow-y-auto flex flex-col items-center justify-start md:justify-center bg-[#1c0f1a] text-[#f4dcec] p-4 pt-18 md:pt-0 pb-28 md:pb-8 w-full select-none">
        {/* Custom Styles for Overlay & Animations */}
        <style>{`
          .btn-difficulty-active {
            background: rgba(255, 171, 243, 0.2) !important;
            border: 2px solid #ffabf3 !important;
            color: #ffabf3 !important;
            font-weight: bold !important;
            box-shadow: 0 0 10px rgba(255, 171, 243, 0.3) !important;
            padding: 8px 0 !important;
          }

          .btn-difficulty-inactive {
            background: transparent !important;
            border: 1px solid rgba(0, 251, 251, 0.3) !important;
            color: rgba(0, 251, 251, 0.7) !important;
            padding: 8px 0 !important;
          }

          .btn-difficulty-inactive:hover {
            background: rgba(0, 251, 251, 0.15) !important;
            border-color: rgba(0, 251, 251, 0.6) !important;
            color: #00fbfb !important;
          }

          .btn-difficulty-active:hover {
            background: rgba(255, 171, 243, 0.35) !important;
            box-shadow: 0 0 15px rgba(255, 171, 243, 0.5) !important;
          }

          .btn-speed-active {
            background: rgba(41, 27, 39, 0.9) !important;
            border: 2px solid #00fbfb !important;
            color: #00fbfb !important;
            font-weight: bold !important;
            box-shadow: 0 0 15px rgba(0, 251, 251, 0.25) !important;
            padding: 10px 0 !important;
          }

          .btn-speed-active:hover {
            background: rgba(41, 27, 39, 1) !important;
            box-shadow: 0 0 20px rgba(0, 251, 251, 0.45) !important;
          }

          .btn-speed-inactive {
            background: rgba(22, 10, 21, 0.4) !important;
            border: 1px solid rgba(0, 251, 251, 0.2) !important;
            color: rgba(0, 251, 251, 0.5) !important;
            padding: 10px 0 !important;
          }

          .btn-speed-inactive:hover {
            background: rgba(0, 251, 251, 0.1) !important;
            border-color: rgba(0, 251, 251, 0.4) !important;
            color: #00fbfb !important;
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



        {/* Main Setup Card container (Desktop: Centered) */}
        <div className="game-card game-card-cyan start-container flex flex-col justify-between p-6 md:p-8 z-20">
          {/* Back Button inside setup card */}
          <button
            className="absolute top-5 left-5 text-[#00fbfb] font-retro text-xs md:text-sm font-bold uppercase tracking-widest bg-transparent border-none p-0 cursor-pointer z-20 flex items-center gap-2 hover:text-[#ffabf3] transition-all duration-300 group hover:drop-shadow-[0_0_8px_rgba(255,171,243,0.8)]"
            onClick={() => router.push('/')}
          >
            <BackArrowIcon size={20} className="group-hover:-translate-x-1 transition-transform text-glow-cyan" />
            <span>{t('back').replace('← ', '')}</span>
          </button>

          {/* Cosmetic Locker Button inside setup card (Symmetrical on Top-Right) */}
          <button
            className="sp-cosmetics-btn"
            onClick={openLocker}
            title={lang === 'es' ? 'Personalizar Avatar' : 'Customize Avatar'}
            aria-label={lang === 'es' ? 'Personalizar Avatar' : 'Customize Avatar'}
            type="button"
          >
            <ShirtIcon size={18} />
          </button>

          {/* Match Settings Button (JoystickIcon / Gear) */}
          <button
            className="sp-settings-btn"
            onClick={openSettings}
            title={t('roomSettingsTitle')}
            aria-label={t('roomSettingsTitle')}
            type="button"
          >
            <JoystickIcon size={18} />
          </button>

          {/* Corner Accents */}
          <div className="absolute -top-[2px] -left-[2px] w-5 h-5 border-t-4 border-l-4 border-[#00fbfb]"></div>
          <div className="absolute -top-[2px] -right-[2px] w-5 h-5 border-t-4 border-r-4 border-[#00fbfb]"></div>
          <div className="absolute -bottom-[2px] -left-[2px] w-5 h-5 border-b-4 border-l-4 border-[#00fbfb]"></div>
          <div className="absolute -bottom-[2px] -right-[2px] w-5 h-5 border-b-4 border-r-4 border-[#00fbfb]"></div>

          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="text-center mt-2 mb-3">
              {/* Micro-Branding Label */}
              <div className="flex items-center justify-center gap-1.5 mb-1 opacity-60">
                <MusicIcon size={12} className="text-[#ffabf3] pixel-note" />
                <span className="font-display text-[9px] tracking-[0.3em] text-[#f4dcec] uppercase">
                  Voxel Rave
                </span>
              </div>
              <h1 className="font-display text-2xl md:text-3xl text-[#ffabf3] tracking-[0.2em] uppercase mb-1.5 text-glow-magenta">
                {t('singlePlayer')}
              </h1>
              <p className="font-mono text-[10px] text-[#00fbfb]/60 uppercase tracking-widest">
                {t('establishingNeuralLink')}
              </p>

              {/* Real-time Game Difficulty Status Chips */}
              <div className="flex flex-wrap justify-center gap-2 mt-4 font-mono text-[9px] font-bold tracking-wider uppercase">
                {/* Color/Difficulty Chip */}
                {/* Color/Difficulty Chip */}
                <div className="tooltip-container tooltip-align-left">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#291b27]/80 border border-[#00fbfb]/30 rounded-sm">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: (spSettings.maxColors === 4) ? '#22c55e' :
                          (spSettings.maxColors === 6) ? '#3b82f6' :
                            (spSettings.maxColors === 8) ? '#eab308' :
                              '#ef4444',
                        boxShadow: `0 0 6px ${(spSettings.maxColors === 4) ? '#22c55e' :
                            (spSettings.maxColors === 6) ? '#3b82f6' :
                              (spSettings.maxColors === 8) ? '#eab308' :
                                '#ef4444'
                          }`
                      }}
                    />
                    <span style={{
                      color: (spSettings.maxColors === 4) ? '#22c55e' :
                        (spSettings.maxColors === 6) ? '#3b82f6' :
                          (spSettings.maxColors === 8) ? '#eab308' :
                            '#ef4444'
                    }}>
                      {t(spDifficulty)}
                    </span>
                  </div>
                  <div className={`tooltip-box tooltip-${
                    (spSettings.maxColors === 4) ? 'green' :
                      (spSettings.maxColors === 6) ? 'blue' :
                        (spSettings.maxColors === 8) ? 'amber' :
                          'rose'
                  }`}>
                    <span style={{ 
                      color: (spSettings.maxColors === 4) ? '#22c55e' :
                        (spSettings.maxColors === 6) ? '#00fbfb' :
                          (spSettings.maxColors === 8) ? '#eab308' :
                            '#ef4444',
                      fontWeight: 'bold',
                      textShadow: `0 0 5px ${(spSettings.maxColors === 4) ? '#22c55e' :
                        (spSettings.maxColors === 6) ? '#00fbfb' :
                          (spSettings.maxColors === 8) ? '#eab308' :
                            '#ef4444'}`
                    }}>
                      {(spSettings.maxColors ?? 6)} {lang === 'es' ? 'Colores' : 'Colors'}
                    </span>
                    {' - '}
                    {(spSettings.maxColors === 4) ? t('easyDesc') :
                      (spSettings.maxColors === 6) ? t('normalDesc') :
                        (spSettings.maxColors === 8) ? t('hardDesc') :
                          t('extremeDesc')
                    }
                  </div>
                </div>

                {/* Speed Chip */}
                <div className="tooltip-container">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#291b27]/80 border border-white/10 rounded-sm">
                    {spSpeed === 'CHILL' ? (
                      <>
                        <SnowflakeIcon size={10} className="text-[#38bdf8]" />
                        <span className="text-[#38bdf8]">{t('speedChill')}</span>
                      </>
                    ) : spSpeed === 'TURBO' ? (
                      <>
                        <LightningIcon size={10} className="text-[#eab308]" />
                        <span className="text-[#eab308]">{t('speedTurbo')}</span>
                      </>
                    ) : (
                      <>
                        <StopwatchIcon size={10} className="text-[#3b82f6]" />
                        <span className="text-[#3b82f6]">{t('speedNormal')}</span>
                      </>
                    )}
                  </div>
                  <div className={`tooltip-box tooltip-${
                    spSpeed === 'CHILL' ? 'blue' :
                      spSpeed === 'TURBO' ? 'amber' : 'blue'
                  }`}>
                    {spSpeed === 'CHILL' ? t('speedChillDesc') :
                      spSpeed === 'TURBO' ? t('speedTurboDesc') : t('speedNormalDesc')
                    }
                  </div>
                </div>

                {/* Lives Chip */}
                {spSettings.maxLives !== undefined && (
                  <div className="tooltip-container tooltip-align-right">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#291b27]/80 border border-[#f43f5e]/30 rounded-sm">
                      <HeartIcon size={10} style={{ fill: '#f43f5e' }} className="text-[#f43f5e]" />
                      <span className="text-[#f43f5e]">{spSettings.maxLives} {spSettings.maxLives === 1 ? (lang === 'es' ? 'Vida' : 'Life') : (lang === 'es' ? 'Vidas' : 'Lives')}</span>
                    </div>
                    <div className="tooltip-box tooltip-rose">
                      {spSettings.maxLives === 1 ? t('lives1Desc') :
                        spSettings.maxLives === 3 ? t('lives3Desc') :
                          spSettings.maxLives === 5 ? t('lives5Desc') :
                            (lang === 'es' ? `Inicias la partida con ${spSettings.maxLives} vidas.` : `You start the match with ${spSettings.maxLives} lives.`)
                      }
                    </div>
                  </div>
                )}

                {/* Blind Mode Chip */}
                {spSettings.isBlindMode && (
                  <div className="tooltip-container tooltip-align-right">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#291b27]/80 border border-[#d946ef]/30 rounded-sm">
                      <GlassesIcon size={10} className="text-[#d946ef]" />
                      <span className="text-[#d946ef]">{t('blindModeLabel')}</span>
                    </div>
                    <div className="tooltip-box tooltip-purple">
                      {t('blindModeDesc')}
                    </div>
                  </div>
                )}

                {/* Sudden Death Mode Chip */}
                {spSettings.suddenDeathMode && spSettings.suddenDeathMode !== 'NORMAL' && (
                  <div className="tooltip-container tooltip-align-right">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#291b27]/80 border border-red-500/30 rounded-sm">
                      {spSettings.suddenDeathMode === 'CHAOS' ? (
                        <>
                          <SkullIcon size={10} className="text-[#f43f5e]" />
                          <span className="text-[#f43f5e]">{t('sdChaos')}</span>
                        </>
                      ) : (
                        <>
                          <DoveIcon size={10} className="text-[#10b981]" />
                          <span className="text-[#10b981]">{t('sdOff')}</span>
                        </>
                      )}
                    </div>
                    <div className={`tooltip-box tooltip-${spSettings.suddenDeathMode === 'CHAOS' ? 'rose' : 'green'}`}>
                      {spSettings.suddenDeathMode === 'CHAOS' ? t('sdChaosDesc') : t('sdOffDesc')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Setup Form */}
            <div className="flex flex-col gap-4">
              {/* Name Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-end">
                  <label className="font-mono text-[10px] text-[#00fbfb] uppercase tracking-widest font-bold">
                    {t('yourName')}
                  </label>
                  {store.spHighScore > 0 && (
                    <div className="text-right">
                      <span className="block text-[8px] text-[#ffabf3]/60 uppercase font-mono">{t('highScore')}</span>
                      <span className="font-bold text-[#ffabf3] text-glow-magenta font-mono text-xs">{store.spHighScore} pts</span>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <input
                    className="game-input game-input-cyan placeholder-[#00fbfb]/20"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 16) {
                        setName(val);
                      } else {
                        setName(val.slice(0, 16));
                      }
                    }}
                    placeholder={t('namePlaceholder')}
                  />
                </div>
              </div>

              {/* Difficulty Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#00fbfb] uppercase tracking-widest font-bold block">
                  {t('difficulty')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { key: 'easy', colors: 4, label: t('easy') },
                      { key: 'normal', colors: 6, label: t('normal') },
                      { key: 'hard', colors: 8, label: t('hard') },
                      { key: 'extreme', colors: 10, label: t('extreme') },
                    ] as const
                  ).map((diff) => (
                    <button
                      key={diff.key}
                      className={`font-mono text-[10px] uppercase cursor-pointer transition-all duration-200 ${spDifficulty === diff.key
                        ? 'btn-difficulty-active text-glow-magenta'
                        : 'btn-difficulty-inactive'
                        }`}
                      type="button"
                      onClick={() => setSpDifficulty(diff.key)}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-[#00fbfb] uppercase tracking-widest font-bold block">
                  {t('speed')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CHILL', 'NORMAL', 'TURBO'] as const).map((spd) => (
                    <button
                      key={spd}
                      className={`font-mono text-[10px] uppercase cursor-pointer transition-all duration-200 ${spSpeed === spd
                        ? 'btn-speed-active text-glow-cyan'
                        : 'btn-speed-inactive'
                        }`}
                      type="button"
                      onClick={() => setSpSpeed(spd)}
                    >
                      {spd}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Play Button */}
          <button
            className="game-btn game-btn-cyan font-mono mt-6"
            onClick={() => {
              if (!validateName()) return;
              store.setPlayerName(name.trim());

              // Start single player with full RoomSettings
              window.dispatchEvent(new CustomEvent('sp:start', {
                detail: { settings: spSettings }
              }));
            }}
          >
            <span>{t('playSolo')}</span>
            <PlayArrowIcon size={24} className="drop-shadow-[0_0_5px_rgba(56,0,56,0.6)] animate-pulse" />
          </button>
        </div>
      </div>
      <MenuFooter />

      {/* Modern Glassmorphic Settings Modal */}
      {isSettingsOpen && (
        (() => {
          const activeSettings = draftSettings || spSettings;
          return (
            <div className="settings-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title">
              <div className="settings-modal-card">
                <span className="hud-corner top-left" aria-hidden="true"></span>
                <span className="hud-corner top-right" aria-hidden="true"></span>
                <span className="hud-corner bottom-left" aria-hidden="true"></span>
                <span className="hud-corner bottom-right" aria-hidden="true"></span>
                <div className="hud-scanlines" aria-hidden="true"></div>

                <div className="settings-modal-header">
                  <h3 className="settings-modal-title" id="settings-title">{t('roomSettingsTitle')}</h3>
                  <button
                    className="settings-modal-close"
                    onClick={cancelSettings}
                    aria-label={lang === 'es' ? 'Cerrar ajustes' : 'Close settings'}
                  >
                    &times;
                  </button>
                </div>

                <div className="settings-modal-body settings-modal-body--with-sidebar">
                  <div className="settings-sidebar">
                    <button
                      className={`settings-tab-btn ${activeTab === 'difficulty' ? 'active' : ''}`}
                      onClick={() => setActiveTab('difficulty')}
                    >
                      <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}><PaletteIcon size={16} /></span>
                      <span className="tab-label">{t('tabColors')}</span>
                    </button>
                    <button
                      className={`settings-tab-btn ${activeTab === 'speed' ? 'active' : ''}`}
                      onClick={() => setActiveTab('speed')}
                    >
                      <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}><StopwatchIcon size={16} /></span>
                      <span className="tab-label">{t('tabSpeed')}</span>
                    </button>
                    <button
                      className={`settings-tab-btn ${activeTab === 'lives' ? 'active' : ''}`}
                      onClick={() => setActiveTab('lives')}
                    >
                      <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}><HeartIcon size={16} style={{ fill: '#f43f5e' }} /></span>
                      <span className="tab-label">{t('tabLives')}</span>
                    </button>
                    <button
                      className={`settings-tab-btn ${activeTab === 'modifiers' ? 'active' : ''}`}
                      onClick={() => setActiveTab('modifiers')}
                    >
                      <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}><SkullIcon size={16} /></span>
                      <span className="tab-label">{t('tabModifiers')}</span>
                    </button>
                  </div>

                  <div className="settings-content-area" style={{ maxHeight: '380px', overflowY: 'auto', minHeight: 0, paddingRight: '8px' }}>
                    {activeTab === 'difficulty' && (
                      <div className="settings-tab-content fade-in">
                        <h4 className="settings-modal-subtitle">{t('activeColorsLabel')}</h4>
                        <p className="settings-modal-intro">{t('activeColorsDesc')}</p>

                        <div className="difficulty-tiers-list">
                          <button
                            className={`difficulty-tier-btn tier--easy ${(activeSettings.maxColors ?? 6) === 4 ? 'active' : ''}`}
                            onClick={() => updateDraftSettings({ maxColors: 4 })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="voxel-color-dot" style={{ backgroundColor: '#10b981', display: 'inline-block', width: '12px', height: '12px', borderRadius: '2px' }} />
                              <span className="tier-name">{t('easyLabel')}</span>
                            </div>
                            <p className="tier-desc">{t('easyDesc')}</p>
                          </button>

                          <button
                            className={`difficulty-tier-btn tier--normal ${(activeSettings.maxColors ?? 6) === 6 ? 'active' : ''}`}
                            onClick={() => updateDraftSettings({ maxColors: 6 })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="voxel-color-dot" style={{ backgroundColor: '#3b82f6', display: 'inline-block', width: '12px', height: '12px', borderRadius: '2px' }} />
                              <span className="tier-name">{t('normalLabel')}</span>
                            </div>
                            <p className="tier-desc">{t('normalDesc')}</p>
                          </button>

                          <button
                            className={`difficulty-tier-btn tier--hard ${(activeSettings.maxColors ?? 6) === 8 ? 'active' : ''}`}
                            onClick={() => updateDraftSettings({ maxColors: 8 })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="voxel-color-dot" style={{ backgroundColor: '#eab308', display: 'inline-block', width: '12px', height: '12px', borderRadius: '2px' }} />
                              <span className="tier-name">{t('hardLabel')}</span>
                            </div>
                            <p className="tier-desc">{t('hardDesc')}</p>
                          </button>

                          <button
                            className={`difficulty-tier-btn tier--extreme ${(activeSettings.maxColors ?? 6) === 10 ? 'active' : ''}`}
                            onClick={() => updateDraftSettings({ maxColors: 10 })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="voxel-color-dot" style={{ backgroundColor: '#ef4444', display: 'inline-block', width: '12px', height: '12px', borderRadius: '2px' }} />
                              <span className="tier-name">{t('extremeLabel')}</span>
                            </div>
                            <p className="tier-desc">{t('extremeDesc')}</p>
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'speed' && (
                      <div className="settings-tab-content fade-in">
                        <h4 className="settings-modal-subtitle">{t('speedLabel')}</h4>
                        <p className="settings-modal-intro">{t('speedDesc')}</p>

                        <div className="difficulty-tiers-list">
                          <button
                            className={`difficulty-tier-btn tier--chill ${(activeSettings.gameSpeed === 'CHILL') ? 'active' : ''}`}
                            onClick={() => updateDraftSettings({ gameSpeed: 'CHILL' })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}><SnowflakeIcon size={16} /></span>
                              <span className="tier-name">{t('speedChill')}</span>
                            </div>
                            <p className="tier-desc">{t('speedChillDesc')}</p>
                          </button>

                          <button
                            className={`difficulty-tier-btn tier--normal ${(activeSettings.gameSpeed === 'NORMAL' || !activeSettings.gameSpeed) ? 'active' : ''}`}
                            onClick={() => updateDraftSettings({ gameSpeed: 'NORMAL' })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}><StopwatchIcon size={16} /></span>
                              <span className="tier-name">{t('speedNormal')}</span>
                            </div>
                            <p className="tier-desc">{t('speedNormalDesc')}</p>
                          </button>

                          <button
                            className={`difficulty-tier-btn tier--turbo ${(activeSettings.gameSpeed === 'TURBO') ? 'active' : ''}`}
                            onClick={() => updateDraftSettings({ gameSpeed: 'TURBO' })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}><LightningIcon size={16} /></span>
                              <span className="tier-name">{t('speedTurbo')}</span>
                            </div>
                            <p className="tier-desc">{t('speedTurboDesc')}</p>
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'lives' && (
                      <div className="settings-tab-content fade-in">
                        <h4 className="settings-modal-subtitle">{t('livesTitle')}</h4>
                        <p className="settings-modal-intro">{t('livesDesc')}</p>

                        <div className="difficulty-tiers-list">
                          <button
                            className={`difficulty-tier-btn tier--hard ${(activeSettings.maxLives === 1) ? 'active' : ''}`}
                            onClick={() => updateDraftSettings({ maxLives: 1 })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}><SkullIcon size={16} /></span>
                              <span className="tier-name">{t('lives1')}</span>
                            </div>
                            <p className="tier-desc">{t('lives1Desc')}</p>
                          </button>

                          <button
                            className={`difficulty-tier-btn tier--normal ${(activeSettings.maxLives === 3 || !activeSettings.maxLives) ? 'active' : ''}`}
                            onClick={() => updateDraftSettings({ maxLives: 3 })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}><HeartIcon size={16} style={{ fill: '#f43f5e' }} /></span>
                              <span className="tier-name">{t('lives3')}</span>
                            </div>
                            <p className="tier-desc">{t('lives3Desc')}</p>
                          </button>

                          <button
                            className={`difficulty-tier-btn tier--easy ${(activeSettings.maxLives === 5) ? 'active' : ''}`}
                            onClick={() => updateDraftSettings({ maxLives: 5 })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}><HeartIcon size={16} style={{ fill: '#f43f5e', filter: 'drop-shadow(0 0 4px #f43f5e)' }} /></span>
                              <span className="tier-name">{t('lives5')}</span>
                            </div>
                            <p className="tier-desc">{t('lives5Desc')}</p>
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'modifiers' && (
                      <div className="settings-tab-content fade-in" style={{ paddingBottom: '24px' }}>
                        <h4 className="settings-modal-subtitle">{t('tabModifiers')}</h4>
                        <p className="settings-modal-description">
                          {t('modifiersDesc')}
                        </p>

                        <div className="difficulty-tiers-list">
                          <button
                            className={`difficulty-tier-btn tier--extreme ${activeSettings.isBlindMode ? 'active' : ''}`}
                            onClick={() => updateDraftSettings({ isBlindMode: !activeSettings.isBlindMode })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}><GlassesIcon size={16} /></span>
                              <span className="tier-name">{t('blindModeLabel')}</span>
                            </div>
                            <p className="tier-desc">{t('blindModeDesc')}</p>
                          </button>
                        </div>

                        <button
                          className="difficulty-tier-btn"
                          style={{
                            width: '100%',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '14px 18px',
                            background: 'rgba(0, 240, 255, 0.03)',
                            border: '1px solid rgba(0, 240, 255, 0.2)',
                            boxShadow: '0 0 10px rgba(0, 240, 255, 0.05)',
                            marginTop: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                          }}
                          onClick={() => setIsSdExpanded(!isSdExpanded)}
                        >
                          <div className="tier-header" style={{ margin: 0, gap: '10px', display: 'flex', alignItems: 'center' }}>
                            <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}>
                              {activeSettings.suddenDeathMode === 'CHAOS' ? (
                                <SkullIcon size={16} />
                              ) : activeSettings.suddenDeathMode === 'OFF' ? (
                                <DoveIcon size={16} />
                              ) : (
                                <StopwatchIcon size={16} />
                              )}
                            </span>
                            <span className="tier-name" style={{ fontSize: '0.9rem', color: 'var(--c-accent)' }}>
                              {t('suddenDeathLabel')}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <strong
                              style={{
                                fontSize: '0.78rem',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: activeSettings.suddenDeathMode === 'CHAOS' ? 'rgba(244, 63, 94, 0.15)' :
                                  activeSettings.suddenDeathMode === 'OFF' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: activeSettings.suddenDeathMode === 'CHAOS' ? '#f43f5e' :
                                  activeSettings.suddenDeathMode === 'OFF' ? '#10b981' : '#3b82f6',
                                border: `1px solid ${activeSettings.suddenDeathMode === 'CHAOS' ? 'rgba(244, 63, 94, 0.3)' :
                                  activeSettings.suddenDeathMode === 'OFF' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'
                                  }`,
                                textShadow: `0 0 8px ${activeSettings.suddenDeathMode === 'CHAOS' ? 'rgba(244, 63, 94, 0.3)' :
                                  activeSettings.suddenDeathMode === 'OFF' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'
                                  }`
                              }}
                            >
                              {activeSettings.suddenDeathMode === 'CHAOS' ? t('sdChaos') :
                                activeSettings.suddenDeathMode === 'OFF' ? t('sdOff') : t('sdNormal')}
                            </strong>

                            <span style={{
                              fontSize: '0.9rem',
                              color: 'var(--c-muted)',
                              transform: isSdExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}>
                              ▼
                            </span>
                          </div>
                        </button>

                        <div style={{
                          maxHeight: isSdExpanded ? '500px' : '0px',
                          overflow: 'hidden',
                          opacity: isSdExpanded ? 1 : 0,
                          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          paddingTop: isSdExpanded ? '12px' : '0px',
                          paddingLeft: '4px',
                          paddingRight: '4px',
                        }}>
                          <p className="settings-modal-description" style={{ margin: '0 0 4px 0' }}>
                            {t('suddenDeathDesc')}
                          </p>

                          <button
                            className={`difficulty-tier-btn tier--easy ${(activeSettings.suddenDeathMode === 'OFF') ? 'active' : ''}`}
                            style={{ width: '100%', textAlign: 'left' }}
                            onClick={() => updateDraftSettings({ suddenDeathMode: 'OFF' })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}><DoveIcon size={16} /></span>
                              <span className="tier-name">{t('sdOff')}</span>
                            </div>
                            <p className="tier-desc">{t('sdOffDesc')}</p>
                          </button>

                          <button
                            className={`difficulty-tier-btn tier--normal ${(activeSettings.suddenDeathMode === 'NORMAL' || !activeSettings.suddenDeathMode) ? 'active' : ''}`}
                            style={{ width: '100%', textAlign: 'left' }}
                            onClick={() => updateDraftSettings({ suddenDeathMode: 'NORMAL' })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}><StopwatchIcon size={16} /></span>
                              <span className="tier-name">{t('sdNormal')}</span>
                            </div>
                            <p className="tier-desc">{t('sdNormalDesc')}</p>
                          </button>

                          <button
                            className={`difficulty-tier-btn tier--hard ${(activeSettings.suddenDeathMode === 'CHAOS') ? 'active' : ''}`}
                            style={{ width: '100%', textAlign: 'left' }}
                            onClick={() => updateDraftSettings({ suddenDeathMode: 'CHAOS' })}
                          >
                            <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}><SkullIcon size={16} /></span>
                              <span className="tier-name">{t('sdChaos')}</span>
                            </div>
                            <p className="tier-desc">{t('sdChaosDesc')}</p>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="settings-modal-footer" style={{ display: 'flex', gap: '15px', width: '100%' }}>
                  <button
                    className="settings-modal-cancel-btn"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontFamily: 'var(--font-display)',
                    }}
                    onClick={cancelSettings}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.3)';
                      e.currentTarget.style.color = '#fb7185';
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(244, 63, 94, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#94a3b8';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    className="settings-modal-save-btn"
                    style={{ flex: 1, width: 'auto' }}
                    onClick={saveSettings}
                  >
                    {t('closeBtn')}
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Leaderboard Modal */}
      {isLeaderboardOpen && (
        <div
          className="leaderboard-modal-overlay"
          onClick={() => setIsLeaderboardOpen(false)}
        >
          <div
            className="leaderboard-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Accent Corners */}
            <div className="absolute -top-[2px] -left-[2px] w-4 h-4 border-t-2 border-l-2 border-[#ffabf3]"></div>
            <div className="absolute -top-[2px] -right-[2px] w-4 h-4 border-t-2 border-r-2 border-[#ffabf3]"></div>
            <div className="absolute -bottom-[2px] -left-[2px] w-4 h-4 border-b-2 border-l-2 border-[#ffabf3]"></div>
            <div className="absolute -bottom-[2px] -right-[2px] w-4 h-4 border-b-2 border-r-2 border-[#ffabf3]"></div>

            {/* Close Button [X] */}
            <button
              className="absolute top-3 right-3 text-[#ffabf3]/60 hover:text-[#ffabf3] font-mono text-xs cursor-pointer bg-none border-none p-1 transition-colors"
              onClick={() => setIsLeaderboardOpen(false)}
              style={{ border: 'none', background: 'none' }}
            >
              [X]
            </button>

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 w-full pr-8">
              <div className="flex items-center gap-3 text-[#ffabf3] font-display text-sm tracking-wider uppercase">
                <TrophyIcon size={22} className="text-glow-magenta" />
                <h2>{t('globalLeaderboard')}</h2>
              </div>
              
              {/* Score Multiplier Help Tooltip */}
              <div className="relative group/tooltip">
                <button
                  type="button"
                  className="w-5 h-5 rounded-full border border-[#ffabf3]/40 flex items-center justify-center text-[10px] text-[#ffabf3]/60 hover:text-[#ffabf3] hover:border-[#ffabf3] font-mono font-bold cursor-help transition-all"
                >
                  ?
                </button>
                <div className="absolute right-0 top-6 w-64 bg-[#120811] border border-[#ffabf3]/30 p-3 rounded shadow-2xl z-50 text-[10px] font-mono text-left text-white/90 hidden group-hover/tooltip:block pointer-events-none">
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
            </div>

            {/* Scrollable list */}
            <div className="max-h-[180px] overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-1.5">
              {loadingLeaderboard ? (
                <p className="font-mono text-xs text-[#00fbfb]/60 text-center py-6 animate-pulse">{t('leaderboardLoading')}</p>
              ) : leaderboard.length === 0 ? (
                <p className="font-mono text-xs text-white/40 text-center py-6">No records yet. Be the first!</p>
              ) : (
                leaderboard.map((entry, index) => {
                  const isRank1 = index === 0;
                  const isRank2 = index === 1;
                  const isRank3 = index === 2;
                  const isCurrentUser = entry.player_id === store.spPlayerId;

                  return (
                    <div
                      key={entry.id}
                      className={`flex justify-between items-center text-xs font-mono border-b border-white/5 transition-all ${isCurrentUser ? 'bg-[#00fbfb]/10 border border-[#00fbfb]/20 rounded-sm' : ''
                        }`}
                      style={{ padding: '8px 10px' }}
                    >
                      <span className="overflow-hidden text-ellipsis white-space-nowrap max-w-[70%] text-left">
                        <span className={isRank1 ? 'text-[#eaea00] font-bold' : isRank2 ? 'text-[#cbd5e1]' : isRank3 ? 'text-[#b45309]' : 'text-white/80'}>
                          {String(index + 1).padStart(2, '0')}. {entry.name}
                        </span>
                      </span>
                      <span className={`font-bold ${isRank1 ? 'text-[#eaea00] text-glow-cyan' : 'text-[#ffabf3]'
                        }`}>
                        {entry.score.toLocaleString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer view rankings button */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                className="w-full py-2 text-[10px] font-mono uppercase tracking-widest text-[#00fbfb]/60 hover:text-[#00fbfb] transition-colors flex items-center justify-center gap-2 group cursor-pointer"
                style={{ border: 'none', background: 'none' }}
                onClick={() => {
                  setIsLeaderboardOpen(false);
                  router.push('/leaderboard');
                }}
              >
                <span>{lang === 'es' ? 'Ver Tabla Completa' : 'View Full Leaderboard'}</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* R3F Centered Glassmorphic Cosmetics Locker Modal */}
      {isLockerOpen && (
        (() => {
          const activeCosmetics = draftCosmetics || localCosmetics;
          return (
            <div className="locker-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="locker-title">
              <div className="locker-modal-card hud-card">
                {/* HUD Corner Brackets */}
                <span className="hud-corner top-left" aria-hidden="true"></span>
                <span className="hud-corner top-right" aria-hidden="true"></span>
                <span className="hud-corner bottom-left" aria-hidden="true"></span>
                <span className="hud-corner bottom-right" aria-hidden="true"></span>

                <div className="locker-modal-header">
                  <div className="flex items-center gap-3">
                    {/* Dial Vector Icon */}
                    <svg className="w-6 h-6 text-fuchsia-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <div>
                      <h3 className="locker-modal-title" id="locker-title">{lang === 'es' ? 'Locker de Avatar' : 'Avatar Locker'}</h3>
                      <p className="hud-terminal-sub">SYSTEM // CALIBRATING_DNA_STREAM... <span className="blinking-cursor">_</span></p>
                    </div>
                  </div>
                  <button
                    className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-white/3 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all duration-200 cursor-pointer"
                    onClick={cancelLocker}
                    title={lang === 'es' ? 'Cerrar' : 'Close'}
                    aria-label={lang === 'es' ? 'Cerrar locker' : 'Close locker'}
                    type="button"
                  >
                    <svg className="w-4 h-4 text-white/70 hover:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="locker-modal-body">
                  {/* Left Column: 3D Live Preview - ALWAYS FIXED, NO SCROLL */}
                  <div className="locker-modal-preview-panel">
                    <div className="locker-modal-canvas-container hud-terminal-container">
                      <span className="hud-border-bracket top-left"></span>
                      <span className="hud-border-bracket top-right"></span>
                      <span className="hud-border-bracket bottom-left"></span>
                      <span className="hud-border-bracket bottom-right"></span>
                      <div className="hud-scanlines"></div>
                      {/* Neon Scanner laser beam sweep */}
                      <div className="hud-scanner-beam"></div>

                      {previewPlayer && (
                        <Canvas camera={{ position: [1, 0.3, 2.8], fov: 55 }}>
                          <ambientLight intensity={0.7} />
                          <directionalLight position={[2, 5, 2]} intensity={1.5} castShadow />
                          <pointLight position={[-3, 3, -3]} intensity={0.5} />
                          <group position={[0, -0.35, 0]}>
                            <PlayerMesh player={previewPlayer} isLocal={true} isPreview={true} previewAnimType={previewAnimType} />
                          </group>
                          <OrbitControls
                            enableZoom={true}
                            enablePan={false}
                            minDistance={1.4}
                            maxDistance={4.0}
                            minPolarAngle={Math.PI / 2.8}
                            maxPolarAngle={Math.PI / 2}
                          />
                        </Canvas>
                      )}
                    </div>
                    <p className="locker-modal-hint">
                      {lang === 'es' ? '↔ Arrastra para rotar en 3D' : '↔ Drag to rotate in 3D'}
                    </p>
                  </div>

                  {/* Right Column: Controls - SCROLL INDEPENDIENTE */}
                  <div className="locker-modal-controls-panel">
                    {/* Cyberpunk Navigation Sub-tabs */}
                    <div className="flex border-b border-white/10 mb-4 w-full gap-2 p-1 bg-black/40 rounded-lg">
                      <button
                        className={`flex-1 py-2 md:py-3 px-1 md:px-4 font-mono text-[9px] md:text-xs font-extrabold uppercase tracking-normal md:tracking-widest flex items-center justify-center gap-1 md:gap-2 cursor-pointer transition-all duration-200 rounded-md ${lockerTab === 'equip'
                            ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400 text-shadow-[0_0_8px_rgba(0,243,255,0.4)] shadow-[inset_0_0_10px_rgba(0,243,255,0.05)]'
                            : 'text-neutral-400 border-b-2 border-transparent hover:bg-white/5 hover:text-white'
                          }`}
                        onClick={() => { setLockerTab('equip'); setPreviewAnimType(null); }}
                        type="button"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{lang === 'es' ? 'Equipar' : 'Equip'}</span>
                      </button>
                      <button
                        className={`flex-1 py-2 md:py-3 px-1 md:px-4 font-mono text-[9px] md:text-xs font-extrabold uppercase tracking-normal md:tracking-widest flex items-center justify-center gap-1 md:gap-2 cursor-pointer transition-all duration-200 rounded-md ${lockerTab === 'colors'
                            ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400 text-shadow-[0_0_8px_rgba(0,243,255,0.4)] shadow-[inset_0_0_10px_rgba(0,243,255,0.05)]'
                            : 'text-neutral-400 border-b-2 border-transparent hover:bg-white/5 hover:text-white'
                          }`}
                        onClick={() => { setLockerTab('colors'); setPreviewAnimType(null); }}
                        type="button"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <span>{lang === 'es' ? 'Colores' : 'Colors'}</span>
                      </button>
                      <button
                        className={`flex-1 py-2 md:py-3 px-1 md:px-4 font-mono text-[9px] md:text-xs font-extrabold uppercase tracking-normal md:tracking-widest flex items-center justify-center gap-1 md:gap-2 cursor-pointer transition-all duration-200 rounded-md ${lockerTab === 'anims'
                            ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400 text-shadow-[0_0_8px_rgba(0,243,255,0.4)] shadow-[inset_0_0_10px_rgba(0,243,255,0.05)]'
                            : 'text-neutral-400 border-b-2 border-transparent hover:bg-white/5 hover:text-white'
                          }`}
                        onClick={() => { setLockerTab('anims'); setPreviewAnimType('dance'); }}
                        type="button"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{lang === 'es' ? 'Animaciones' : 'Animations'}</span>
                      </button>
                    </div>

                    <div className="locker-tab-content-scroll">
                      {lockerTab === 'equip' && (
                        <div className="flex flex-col gap-5 fade-in">
                          {/* Accessories */}
                          <div className="locker-modal-section">
                            <h3 className="locker-modal-section-title flex items-center gap-2">
                              <svg className="w-4 h-4 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              <span>{lang === 'es' ? 'Accesorios' : 'Accessories'}</span>
                            </h3>
                            <div className="locker-modal-toggles-grid">
                              <button
                                className={`locker-modal-toggle-card ${activeCosmetics.headphonesEnabled ? 'active' : ''}`}
                                onClick={() => updateDraftCosmetics({ headphonesEnabled: !activeCosmetics.headphonesEnabled })}
                                type="button"
                              >
                                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V9a6 6 0 00-12 0v10a2 2 0 002 2z" />
                                </svg>
                                <span className="locker-modal-toggle-label">
                                  {lang === 'es' ? 'Auriculares Beat-Sync' : 'Beat-Sync Headphones'}
                                </span>
                              </button>
                              <button
                                className={`locker-modal-toggle-card ${activeCosmetics.backpackEnabled ? 'active' : ''}`}
                                onClick={() => updateDraftCosmetics({ backpackEnabled: !activeCosmetics.backpackEnabled })}
                                type="button"
                              >
                                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <span className="locker-modal-toggle-label">
                                  {lang === 'es' ? 'Cyber-Mochila Jet' : 'Cyber-Backpack Jet'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Companions */}
                          <div className="locker-modal-section">
                            <h3 className="locker-modal-section-title flex items-center gap-2">
                              <svg className="w-4 h-4 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>{lang === 'es' ? 'Cyber-Mascota Flotante' : 'Floating Cyber Pet'}</span>
                            </h3>
                            <div className="locker-modal-options-grid">
                              {(['none', 'cassette', 'floppy', 'orb'] as const).map((type) => (
                                <button
                                  key={type}
                                  className={`locker-modal-option-btn ${activeCosmetics.companionType === type ? 'active' : ''}`}
                                  onClick={() => updateDraftCosmetics({ companionType: type })}
                                  type="button"
                                >
                                  {type === 'none' && (
                                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                  )}
                                  {type === 'cassette' && (
                                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2M8 14h.01M16 14h.01M12 14a1 1 0 100-2 1 1 0 000 2z" />
                                    </svg>
                                  )}
                                  {type === 'floppy' && (
                                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-8 0V4a1 1 0 011-1h4a1 1 0 011 1v3M8 7h8m-5 8h2m-6 3h8" />
                                    </svg>
                                  )}
                                  {type === 'orb' && (
                                    <svg className="w-4 h-4 text-cyan-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 15a3 3 0 100-6 3 3 0 000 6z" />
                                    </svg>
                                  )}
                                  <span className="locker-modal-option-name">
                                    {type === 'none' && (lang === 'es' ? 'Ninguna' : 'None')}
                                    {type === 'cassette' && 'Retro Cassette'}
                                    {type === 'floppy' && 'Voxel Floppy'}
                                    {type === 'orb' && 'Pulse Orb'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Skins */}
                          <div className="locker-modal-section">
                            <h3 className="locker-modal-section-title flex items-center gap-2">
                              <svg className="w-4 h-4 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span>{lang === 'es' ? 'Material del Traje' : 'Suit Material'}</span>
                            </h3>
                            <div className="locker-modal-skins-row">
                              {(['matte', 'chrome', 'neon'] as const).map((skin) => (
                                <button
                                  key={skin}
                                  className={`locker-modal-skin-btn locker-modal-skin-btn--${skin} ${activeCosmetics.skinMaterial === skin ? 'active' : ''} flex items-center gap-2`}
                                  onClick={() => updateDraftCosmetics({ skinMaterial: skin })}
                                  type="button"
                                >
                                  {skin === 'matte' && (
                                    <>
                                      <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                      </svg>
                                      <span>{lang === 'es' ? 'Mate Plástico' : 'Matte Plastic'}</span>
                                    </>
                                  )}
                                  {skin === 'chrome' && (
                                    <>
                                      <svg className="w-4 h-4 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                      </svg>
                                      <span>{lang === 'es' ? 'Cromo Espejado' : 'Mirror Chrome'}</span>
                                    </>
                                  )}
                                  {skin === 'neon' && (
                                    <>
                                      <svg className="w-4 h-4 text-rose-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                      <span>{lang === 'es' ? 'Neón Holograma' : 'Neon Hologram'}</span>
                                    </>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {lockerTab === 'colors' && (
                        <div className="flex flex-col gap-4 fade-in">
                          {/* Colors Customization Section */}
                          <div className="locker-modal-section">
                            <h3 className="locker-modal-section-title flex items-center gap-2">
                              <svg className="w-4 h-4 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                              </svg>
                              <span>{lang === 'es' ? 'Calibrar Colores' : 'Calibrate Colors'}</span>
                            </h3>
                            <div className="locker-color-customizer">
                              {(() => {
                                const takenColors: string[] = [];

                                const colorItems: { key: keyof PlayerCosmetics; label: string; active: boolean; fallback: string }[] = [
                                  { key: 'primaryColor', label: lang === 'es' ? 'Traje (Principal)' : 'Suit (Primary)', active: true, fallback: previewPlayer?.color || PLAYER_COLORS[0] },
                                  { key: 'shoesColor', label: lang === 'es' ? 'Zapatos' : 'Shoes', active: true, fallback: '#ffe600' },
                                  { key: 'visorColor', label: lang === 'es' ? 'Visor' : 'Visor', active: true, fallback: '#00f3ff' },
                                  { key: 'heartColor', label: lang === 'es' ? 'Corazón' : 'Heart', active: true, fallback: '#ff007f' },
                                  { key: 'headphonesColor', label: lang === 'es' ? 'Auriculares' : 'Headphones', active: activeCosmetics.headphonesEnabled, fallback: previewPlayer?.color || PLAYER_COLORS[0] },
                                  { key: 'backpackColor', label: lang === 'es' ? 'Mochila' : 'Backpack', active: activeCosmetics.backpackEnabled, fallback: previewPlayer?.color || PLAYER_COLORS[0] },
                                  { key: 'companionColor', label: lang === 'es' ? 'Mascota' : 'Cyber Pet', active: activeCosmetics.companionType !== 'none', fallback: previewPlayer?.color || PLAYER_COLORS[0] },
                                ];

                                return colorItems
                                  .filter(item => item.active)
                                  .map((item) => {
                                    const currentValue = activeCosmetics[item.key] || item.fallback;
                                    const currentValueStr = String(currentValue || '').toLowerCase();

                                    return (
                                      <div key={item.key} className="locker-color-row">
                                        <span className="locker-color-row-title">{item.label}</span>
                                        <div className="locker-color-swatches-grid">
                                          {PLAYER_COLORS.map((color) => {
                                            const isSelected = currentValueStr === color.toLowerCase();
                                            const isTaken = item.key === 'primaryColor' && takenColors.includes(color.toLowerCase());
                                            const localizedColorName = isTaken
                                              ? `${getColorName(color, lang)} (${lang === 'es' ? 'Ocupado' : 'Taken'})`
                                              : getColorName(color, lang);

                                            const swatchStyle: React.CSSProperties & { '--swatch-color'?: string } = {
                                              backgroundColor: color,
                                              '--swatch-color': color,
                                              width: '22px',
                                              height: '22px',
                                              minWidth: '22px',
                                              minHeight: '22px',
                                              display: 'inline-block',
                                              boxShadow: isSelected
                                                ? `0 0 12px ${color}, inset 0 0 4px rgba(0,0,0,0.5)`
                                                : 'inset 0 0 4px rgba(0,0,0,0.6)',
                                              borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.25)',
                                              transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                                            };

                                            return (
                                              <button
                                                key={color}
                                                type="button"
                                                className={`w-6 h-6 rounded-full border-2 cursor-pointer flex-shrink-0 transition-all duration-200 hover:scale-115 active:scale-95 focus:outline-none locker-color-swatch-btn ${isTaken ? 'taken' : ''
                                                  }`}
                                                style={swatchStyle}
                                                onClick={() => {
                                                  if (isTaken) {
                                                    addToast(
                                                      lang === 'es'
                                                        ? `⚠️ ¡El color "${getColorName(color, lang)}" ya está ocupado!`
                                                        : `⚠️ The color "${getColorName(color, lang)}" is already taken!`,
                                                      'error'
                                                    );
                                                  } else {
                                                    updateDraftCosmetics({ [item.key]: color });
                                                  }
                                                }}
                                                title={localizedColorName}
                                                aria-label={localizedColorName}
                                              >
                                                <span className="sr-only">{localizedColorName}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  });
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                      {lockerTab === 'anims' && (
                        <div className="flex flex-col gap-5 fade-in">
                          {/* Animations Customization Section */}
                          <div className="locker-modal-section">
                            <h3 className="locker-modal-section-title flex items-center gap-2">
                              <svg className="w-4 h-4 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{lang === 'es' ? 'Seleccionar Estilos de Animación' : 'Select Animation Styles'}</span>
                            </h3>

                            <div className="flex flex-col gap-4 mt-2">
                              {/* Dance selector */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
                                  {lang === 'es' ? 'Estilo de Baile' : 'Dance Style'}
                                </label>
                                <select
                                  className="lobby-input font-mono text-xs w-full cursor-pointer focus:outline-none focus:border-cyan-400"
                                  value={activeCosmetics.danceStyle || 'random'}
                                  onChange={(e) => {
                                    updateDraftCosmetics({ danceStyle: e.target.value as PlayerCosmetics['danceStyle'] });
                                    setPreviewAnimType('dance');
                                  }}
                                  onFocus={() => setPreviewAnimType('dance')}
                                >
                                  <option value="random">{lang === 'es' ? '🎲 Al Azar por Partida' : '🎲 Random per Match'}</option>
                                  <option value="dance">{lang === 'es' ? '🕺 Baile 1 (Classic Shuffle)' : '🕺 Dance 1 (Classic Shuffle)'}</option>
                                  <option value="dance2">{lang === 'es' ? '🌀 Baile 2 (Spin-Out Spin)' : '🌀 Dance 2 (Spin-Out Spin)'}</option>
                                  <option value="dance3">{lang === 'es' ? '🌊 Baile 3 (Side-Step Wave)' : '🌊 Dance 3 (Side-Step Wave)'}</option>
                                  <option value="dance4">{lang === 'es' ? '🤖 Baile 4 (Robot Twist)' : '🤖 Dance 4 (Robot Twist)'}</option>
                                </select>
                              </div>

                              {/* Idle selector */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
                                  {lang === 'es' ? 'Estilo de Espera (Idle)' : 'Waiting Style (Idle)'}
                                </label>
                                <select
                                  className="lobby-input font-mono text-xs w-full cursor-pointer focus:outline-none focus:border-cyan-400"
                                  value={activeCosmetics.idleStyle || 'random'}
                                  onChange={(e) => {
                                    updateDraftCosmetics({ idleStyle: e.target.value as PlayerCosmetics['idleStyle'] });
                                    setPreviewAnimType('idle');
                                  }}
                                  onFocus={() => setPreviewAnimType('idle')}
                                >
                                  <option value="random">{lang === 'es' ? '🎲 Al Azar por Partida' : '🎲 Random per Match'}</option>
                                  <option value="idle">{lang === 'es' ? '🧍 Clásico (Respiración Normal)' : '🧍 Classic (Normal Breathing)'}</option>
                                  <option value="idle2">{lang === 'es' ? '⏱️ Impaciente (Zapateo Rápido)' : '⏱️ Impatient (Foot Tapping)'}</option>
                                </select>
                              </div>

                              {/* Celebrate selector */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
                                  {lang === 'es' ? 'Estilo de Victoria' : 'Victory Style'}
                                </label>
                                <select
                                  className="lobby-input font-mono text-xs w-full cursor-pointer focus:outline-none focus:border-cyan-400"
                                  value={activeCosmetics.celebrateStyle || 'random'}
                                  onChange={(e) => {
                                    updateDraftCosmetics({ celebrateStyle: e.target.value as PlayerCosmetics['celebrateStyle'] });
                                    setPreviewAnimType('celebrate');
                                  }}
                                  onFocus={() => setPreviewAnimType('celebrate')}
                                >
                                  <option value="random">{lang === 'es' ? '🎲 Al Azar por Partida' : '🎲 Random per Match'}</option>
                                  <option value="celebrate">{lang === 'es' ? '🙌 Clásico (Manos Arriba & Aplauso)' : '🙌 Classic (Arms Up & Clap)'}</option>
                                  <option value="celebrate2">{lang === 'es' ? '🤸 Acrobático (Salto Mortal Backflip)' : '🤸 Acrobatic (Leap Backflip)'}</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="locker-modal-footer">
                  <button
                    className="locker-modal-save-btn flex items-center gap-2"
                    onClick={saveLocker}
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{lang === 'es' ? 'Guardar y Cerrar' : 'Save and Close'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </>
  );
}
