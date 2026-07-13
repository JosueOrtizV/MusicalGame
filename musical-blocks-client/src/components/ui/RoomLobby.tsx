import { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore, selectIsHost } from '@/src/stores/gameStore';
import { getSocket } from '@/src/lib/socketClient';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useToastStore } from '@/src/stores/toastStore';
import { ChatOverlay } from '@/src/components/hud/ChatOverlay';
import { FloatingMusicNotes } from './FloatingMusicNotes';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PlayerMesh } from '../canvas/PlayerMesh';
import { PLAYER_COLORS, PlayerCosmetics, RoomSettings } from '@/src/shared/types';
import {
  JoystickIcon,
  ShirtIcon,
  CopyIcon,
  SnowflakeIcon,
  LightningIcon,
  StopwatchIcon,
  HeartIcon,
  GlassesIcon,
  UsersIcon,
  SkullIcon,
  DoveIcon,
  CheckIcon,
  HourglassIcon,
  EyeIcon,
  PaletteIcon,
  CrownIcon,
  MusicIcon,
  PlayArrowIcon,
  BackArrowIcon
} from './Icons';


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
//  RoomLobby — waiting room after joining / creating a room
// ---------------------------------------------------------------------------
export function RoomLobby() {
  const room = useGameStore((s) => s.room);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const isHost = useGameStore(selectIsHost);
  const store = useGameStore();
  const { t, lang } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const prevPlayersRef = useRef(room?.players ?? []);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState<RoomSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'difficulty' | 'speed' | 'lives' | 'modifiers' | 'players'>('difficulty');
  const [isSdExpanded, setIsSdExpanded] = useState(false);
  const [isLockerOpen, setIsLockerOpen] = useState(false);
  const [lockerTab, setLockerTab] = useState<'equip' | 'colors' | 'anims'>('equip');
  const [draftCosmetics, setDraftCosmetics] = useState<PlayerCosmetics | null>(null);
  const [previewAnimType, setPreviewAnimType] = useState<'dance' | 'idle' | 'celebrate' | null>(null);
  const [autoStartSeconds, setAutoStartSeconds] = useState<number | null>(null);
  const [countdownIsAuto, setCountdownIsAuto] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);
  const hasSyncedSettingsForRoom = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        setIsMounted(true);
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const localCosmetics = useGameStore((s) => s.localCosmetics);
  const updateLocalCosmetics = useGameStore((s) => s.updateLocalCosmetics);

  const openLocker = () => {
    setDraftCosmetics(localCosmetics);
    setIsLockerOpen(true);
    setPreviewAnimType(null);
    window.dispatchEvent(new CustomEvent('chat:minimize'));
  };

  const openSettings = () => {
    if (room?.settings) {
      setDraftSettings({ ...room.settings });
    } else {
      setDraftSettings({
        maxColors: 6,
        gameSpeed: 'NORMAL',
        isBlindMode: false,
        maxLives: 3,
        suddenDeathMode: 'NORMAL',
        enableCollisions: false,
        maxPlayers: 8
      });
    }
    setIsSettingsOpen(true);
    window.dispatchEvent(new CustomEvent('chat:minimize'));
  };

  const saveSettings = () => {
    if (draftSettings) {
      const currentPlayers = room?.players.length ?? 0;
      const finalMaxPlayers = Math.max(currentPlayers, draftSettings.maxPlayers || 8);
      const finalSettings = { ...draftSettings, maxPlayers: finalMaxPlayers };

      getSocket().emit('host:update_settings', { settings: finalSettings });
      store.setHostSettings(finalSettings);
      addToast(
        lang === 'es'
          ? '¡Ajustes de sala guardados y sincronizados!'
          : 'Room settings saved and synchronized!',
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
      const current = prev || room?.settings || {
        maxColors: 6,
        gameSpeed: 'NORMAL' as const,
        isBlindMode: false,
        maxLives: 3,
        suddenDeathMode: 'NORMAL' as const,
        enableCollisions: false,
        maxPlayers: 8
      };
      return { ...current, ...newFields };
    });
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

  // Handle Escape key to close open modals
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

  // Auto-sync saved cosmetics to server upon mounting or selection changes
  useEffect(() => {
    getSocket().emit('player:update_cosmetics', { cosmetics: localCosmetics });
  }, [localCosmetics]);

  // Auto-apply saved hostSettings when hosting a new room
  useEffect(() => {
    if (isHost && room && hasSyncedSettingsForRoom.current !== room.id) {
      hasSyncedSettingsForRoom.current = room.id;
      const savedHostSettings = useGameStore.getState().hostSettings;
      const currentPlayers = room.players.length;
      const finalMaxPlayers = Math.max(currentPlayers, savedHostSettings.maxPlayers || 8);
      const settingsToApply = { ...savedHostSettings, maxPlayers: finalMaxPlayers };
      getSocket().emit('host:update_settings', { settings: settingsToApply });
    }
  }, [isHost, room?.id, room?.players.length]);

  const previewPlayer = useMemo(() => {
    const localPlayer = room?.players.find((p) => p.id === localPlayerId);
    if (!localPlayer) return null;
    const activeCosmetics = isLockerOpen && draftCosmetics ? draftCosmetics : localPlayer.cosmetics;
    return {
      ...localPlayer,
      color: activeCosmetics.primaryColor ?? localPlayer.color,
      cosmetics: activeCosmetics,
    };
  }, [room?.players, localPlayerId, isLockerOpen, draftCosmetics]);

  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (!room) {
      isFirstRenderRef.current = true;
      prevPlayersRef.current = [];
      return;
    }

    const currentPlayers = room.players;

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevPlayersRef.current = currentPlayers;
      return;
    }

    const prevIds = new Set(prevPlayersRef.current.map((p) => p.id));
    const currentIds = new Set(currentPlayers.map((p) => p.id));

    const removeToastsMatching = useToastStore.getState().removeToastsMatching;

    // Players who joined
    const newPlayers = currentPlayers.filter((p) => !prevIds.has(p.id));
    newPlayers.forEach((p) => {
      if (p.id !== localPlayerId) {
        removeToastsMatching((toast) => toast.message.includes(p.name));
        addToast(t('playerJoined', { name: p.name }), 'success');
      }
    });

    // Players who left
    const leftPlayers = prevPlayersRef.current.filter((p) => !currentIds.has(p.id));
    leftPlayers.forEach((p) => {
      if (p.id !== localPlayerId) {
        removeToastsMatching((toast) => toast.message.includes(p.name));
        addToast(t('playerLeft', { name: p.name }), 'info');
      }
    });

    prevPlayersRef.current = currentPlayers;
  }, [room, localPlayerId, t, addToast]);

  useEffect(() => {
    const handleCountdown = ({ seconds, isAuto }: { seconds: number | null; isAuto?: boolean }) => {
      setAutoStartSeconds(seconds);
      if (isAuto !== undefined) {
        setCountdownIsAuto(isAuto);
      }
    };
    getSocket().on('room:auto_start_countdown', handleCountdown);
    return () => {
      getSocket().off('room:auto_start_countdown', handleCountdown);
    };
  }, []);

  useEffect(() => {
    if (autoStartSeconds !== null) {
      document.body.classList.add('game-starting');
    } else {
      document.body.classList.remove('game-starting');
    }
    return () => {
      document.body.classList.remove('game-starting');
    };
  }, [autoStartSeconds]);

  if (!room) return null;

  const isPrivate = room.visibility === 'private';
  const readyCount = room.players.filter((p) => p.isReady).length;
  const requiredCount = Math.max(2, Math.ceil(room.players.length / 2));


  const toggleReady = () => {
    const me = room.players.find((p) => p.id === localPlayerId);
    getSocket().emit('player:ready', { ready: !me?.isReady });
  };

  const startGame = () => {
    if (room.players.length < 2) {
      addToast(t('needMorePlayers'), 'error');
      return;
    }
    if (readyCount < requiredCount) {
      const missingCount = requiredCount - readyCount;
      addToast(t('waitingForReady', { count: missingCount }), 'error');
      return;
    }
    getSocket().emit('host:start_game');
  };

  const cancelStart = () => {
    getSocket().emit('host:cancel_start');
  };

  const leaveRoom = () => {
    getSocket().emit('room:leave');
    store.clearRoom();
  };

  const copyCode = () => {
    if (typeof window !== 'undefined') {
      const inviteUrl = `${window.location.origin}/multiplayer/${room.id.toUpperCase()}`;
      navigator.clipboard.writeText(inviteUrl);
      addToast(t('copiedLink'), 'success');
    }
  };

  const getDifficultyName = (colors: number) => {
    if (colors === 4) return lang === 'es' ? 'Fácil' : 'Easy';
    if (colors === 6) return lang === 'es' ? 'Normal' : 'Normal';
    if (colors === 8) return lang === 'es' ? 'Difícil' : 'Hard';
    return lang === 'es' ? 'Extremo' : 'Extreme';
  };


  return (
    <>
      <FloatingMusicNotes />

      <div className="relative h-[100dvh] overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start md:justify-center bg-[#1c0f1a] text-[#f4dcec] p-4 pt-18 md:pt-0 pb-28 md:pb-8 w-full select-none">
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

        {isMounted && autoStartSeconds !== null && createPortal(
          <div className="lobby-floating-banner">
            <div
              className={`banner-content ${autoStartSeconds <= 3 ? 'critical' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(10, 10, 25, 0.95)',
                backdropFilter: 'blur(12px) saturate(1.5)',
                border: autoStartSeconds <= 3 ? '1.5px solid rgba(244, 63, 94, 0.7)' : '1px solid rgba(0, 240, 255, 0.4)',
                boxShadow: autoStartSeconds <= 3
                  ? '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 20px rgba(244, 63, 94, 0.4)'
                  : '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 240, 255, 0.2)',
                padding: '0.45rem 1.25rem',
                borderRadius: '9999px',
                color: '#fff',
                transition: 'all 0.3s ease',
              }}
            >
              <span
                className="banner-pulse-dot"
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: autoStartSeconds <= 3 ? '#f43f5e' : '#00f0ff',
                  boxShadow: autoStartSeconds <= 3 ? '0 0 8px #f43f5e' : '0 0 8px #00f0ff',
                }}
              />
              <span
                className="banner-text"
                style={{
                  fontFamily: 'var(--font-display), "Inter", sans-serif',
                  fontSize: 'clamp(0.75rem, 3.2vw, 0.85rem)',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                }}
              >
                {countdownIsAuto
                  ? (lang === 'es' ? 'Auto-iniciando en ' : 'Auto starting in ')
                  : (lang === 'es' ? 'Iniciando en ' : 'Starting in ')}
                <strong
                  style={{
                    color: autoStartSeconds <= 3 ? '#f43f5e' : '#00f0ff',
                    fontWeight: 900,
                    fontSize: 'clamp(0.95rem, 4vw, 1.05rem)',
                    textShadow: autoStartSeconds <= 3 ? '0 0 8px rgba(244, 63, 94, 0.7)' : '0 0 8px rgba(0, 240, 255, 0.7)',
                    marginLeft: '4px',
                  }}
                >
                  {autoStartSeconds}s
                </strong>
                {isHost && room.cancellationCount >= 3 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: '#f43f5e',
                      marginLeft: '8px',
                      borderLeft: '1px solid rgba(255,255,255,0.2)',
                      paddingLeft: '8px',
                      fontFamily: 'var(--font-mono), monospace'
                    }}
                  >
                    {lang === 'es' ? 'INICIO INEVITABLE' : 'START INEVITABLE'}
                  </span>
                )}
              </span>
            </div>
          </div>,
          document.body
        )}

        <div className="room-lobby-container w-full max-w-[580px]" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>

          <div className="room-lobby-card game-card game-card-hybrid" style={{ width: '100%', padding: '2.5rem 2rem', margin: 'auto' }}>
            {/* HUD Corner Brackets & Scanlines for maximum Retro-Futurism aesthetic */}
            <span className="hud-corner top-left"></span>
            <span className="hud-corner top-right"></span>
            <span className="hud-corner bottom-left"></span>
            <span className="hud-corner bottom-right"></span>

            {/* Back Button inside setup card */}
            <button
              className="absolute top-5 left-5 text-[#00fbfb] font-retro text-xs md:text-sm font-bold uppercase tracking-widest bg-transparent border-none p-0 cursor-pointer z-20 flex items-center gap-2 hover:text-[#ffabf3] transition-all duration-300 group hover:drop-shadow-[0_0_8px_rgba(255,171,243,0.8)]"
              onClick={leaveRoom}
            >
              <BackArrowIcon size={20} className="group-hover:-translate-x-1 transition-transform text-glow-cyan" />
              <span>{t('back').replace('← ', '')}</span>
            </button>

            {/* Host Settings Trigger Button */}
            {isHost && (
              <button
                className="sp-settings-btn"
                onClick={openSettings}
                title={t('roomSettingsTitle')}
                aria-label={t('roomSettingsTitle')}
                aria-expanded={isSettingsOpen}
                type="button"
              >
                <JoystickIcon size={18} />
              </button>
            )}

            {/* Cosmetic Locker Trigger Button (Symmetrical on Top-Left) */}
            <button
              className="sp-cosmetics-btn"
              onClick={openLocker}
              title={lang === 'es' ? 'Locker de Cosméticos' : 'Cosmetic Locker'}
              aria-label={lang === 'es' ? 'Locker de Cosméticos' : 'Cosmetic Locker'}
              aria-expanded={isLockerOpen}
              type="button"
            >
              <ShirtIcon size={18} />
            </button>

            {/* Header */}
            <div className="room-header text-center relative mb-6">
              <div className="flex justify-center gap-3 mb-2">
                <MusicIcon size={24} className="text-[#ffabf3] animate-bounce" style={{ animationDuration: '2s' }} />
                <MusicIcon size={18} className="text-[#00fbfb] animate-bounce" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tighter italic uppercase bg-gradient-to-r from-[#00fbfb] via-[#ffabf3] to-[#eaea00] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,0,255,0.3)]">
                {isPrivate ? t('privateRoom', { id: room.id }) : t('publicRoom')}
              </h1>
              {isPrivate && (
                <button className="room-code-badge mt-2" onClick={copyCode} title="Click to copy" aria-label={lang === 'es' ? `Copiar código de sala ${room.id}` : `Copy room code ${room.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span className="room-code-text">{room.id}</span>
                  <span className="room-code-copy" style={{ display: 'flex', alignItems: 'center' }}><CopyIcon size={12} /></span>
                </button>
              )}
              <p className="font-mono text-[10px] text-white/50 uppercase tracking-[0.3em] mt-2">
                {isPrivate ? t('shareCodeHint') : t('waitingPlayersHint')}
              </p>

              {/* Real-time Game Difficulty Status Chips */}
              <div className="flex flex-wrap justify-center gap-2 mt-4 font-mono text-[9px] font-bold tracking-wider uppercase">
                {/* Color/Difficulty Chip */}
                <div className="tooltip-container tooltip-align-left">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#291b27]/80 border border-[#00fbfb]/30 rounded-sm">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: (room.settings?.maxColors === 4) ? '#22c55e' :
                          (room.settings?.maxColors === 6) ? '#3b82f6' :
                            (room.settings?.maxColors === 8) ? '#eab308' :
                              '#ef4444',
                        boxShadow: `0 0 6px ${(room.settings?.maxColors === 4) ? '#22c55e' :
                            (room.settings?.maxColors === 6) ? '#3b82f6' :
                              (room.settings?.maxColors === 8) ? '#eab308' :
                                '#ef4444'
                          }`
                      }}
                    />
                    <span style={{
                      color: (room.settings?.maxColors === 4) ? '#22c55e' :
                        (room.settings?.maxColors === 6) ? '#3b82f6' :
                          (room.settings?.maxColors === 8) ? '#eab308' :
                            '#ef4444'
                    }}>
                      {getDifficultyName(room.settings?.maxColors ?? 6)}
                    </span>
                  </div>
                  <div className={`tooltip-box tooltip-${
                    (room.settings?.maxColors === 4) ? 'green' :
                      (room.settings?.maxColors === 6) ? 'blue' :
                        (room.settings?.maxColors === 8) ? 'amber' :
                          'rose'
                  }`}>
                    <span style={{ 
                      color: (room.settings?.maxColors === 4) ? '#22c55e' :
                        (room.settings?.maxColors === 6) ? '#00fbfb' :
                          (room.settings?.maxColors === 8) ? '#eab308' :
                            '#ef4444',
                      fontWeight: 'bold',
                      textShadow: `0 0 5px ${(room.settings?.maxColors === 4) ? '#22c55e' :
                        (room.settings?.maxColors === 6) ? '#00fbfb' :
                          (room.settings?.maxColors === 8) ? '#eab308' :
                            '#ef4444'}`
                    }}>
                      {(room.settings?.maxColors ?? 6)} {lang === 'es' ? 'Colores' : 'Colors'}
                    </span>
                    {' - '}
                    {(room.settings?.maxColors === 4) ? t('easyDesc') :
                      (room.settings?.maxColors === 6) ? t('normalDesc') :
                        (room.settings?.maxColors === 8) ? t('hardDesc') :
                          t('extremeDesc')
                    }
                  </div>
                </div>

                {/* Speed Chip */}
                <div className="tooltip-container">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#291b27]/80 border border-white/10 rounded-sm">
                    {room.settings?.gameSpeed === 'CHILL' ? (
                      <>
                        <SnowflakeIcon size={10} className="text-[#38bdf8]" />
                        <span className="text-[#38bdf8]">{t('speedChill')}</span>
                      </>
                    ) : room.settings?.gameSpeed === 'TURBO' ? (
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
                    room.settings?.gameSpeed === 'CHILL' ? 'blue' :
                      room.settings?.gameSpeed === 'TURBO' ? 'amber' : 'blue'
                  }`}>
                    {room.settings?.gameSpeed === 'CHILL' ? t('speedChillDesc') :
                      room.settings?.gameSpeed === 'TURBO' ? t('speedTurboDesc') : t('speedNormalDesc')
                    }
                  </div>
                </div>

                {/* Lives Chip */}
                {room.settings?.maxLives !== undefined && (
                  <div className="tooltip-container tooltip-align-right">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#291b27]/80 border border-[#f43f5e]/30 rounded-sm">
                      <HeartIcon size={10} style={{ fill: '#f43f5e' }} className="text-[#f43f5e]" />
                      <span className="text-[#f43f5e]">{room.settings.maxLives} {room.settings.maxLives === 1 ? (lang === 'es' ? 'Vida' : 'Life') : (lang === 'es' ? 'Vidas' : 'Lives')}</span>
                    </div>
                    <div className="tooltip-box tooltip-rose">
                      {room.settings.maxLives === 1 ? t('lives1Desc') :
                        room.settings.maxLives === 3 ? t('lives3Desc') :
                          room.settings.maxLives === 5 ? t('lives5Desc') :
                            (lang === 'es' ? `Inicias la partida con ${room.settings.maxLives} vidas.` : `You start the match with ${room.settings.maxLives} lives.`)
                      }
                    </div>
                  </div>
                )}

                {/* Blind Mode Chip */}
                {room.settings?.isBlindMode && (
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

                {/* Collisions Chip */}
                {room.settings?.enableCollisions && (
                  <div className="tooltip-container tooltip-align-right">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#291b27]/80 border border-[#00f0ff]/30 rounded-sm">
                      <UsersIcon size={10} className="text-[#00f0ff]" />
                      <span className="text-[#00f0ff]">{t('collisionsLabel')}</span>
                    </div>
                    <div className="tooltip-box">
                      {t('collisionsEnabledDesc')}
                    </div>
                  </div>
                )}

                {/* Sudden Death Mode Chip */}
                {room.settings?.suddenDeathMode && room.settings.suddenDeathMode !== 'NORMAL' && (
                  <div className="tooltip-container tooltip-align-right">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#291b27]/80 border border-red-500/30 rounded-sm">
                      {room.settings.suddenDeathMode === 'CHAOS' ? (
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
                    <div className={`tooltip-box tooltip-${room.settings.suddenDeathMode === 'CHAOS' ? 'rose' : 'green'}`}>
                      {room.settings.suddenDeathMode === 'CHAOS' ? t('sdChaosDesc') : t('sdOffDesc')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Room Content Wrapper */}
            <div className="room-content-wrapper flex flex-col gap-4">
              {/* Player list */}
              <div className="room-players flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {room.players.map((p) => {
                  const isViewingResults = room.status === 'finished' && !p.hasReturnedToLobby;
                  return (
                    <div
                      key={p.id}
                      className="p-3 border rounded-sm flex items-center justify-between transition-all duration-300 hover:brightness-110"
                      style={{
                        borderColor: `${p.color}40`,
                        backgroundColor: `${p.color}0a`,
                        opacity: isViewingResults ? 0.6 : 1
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-8 h-8 rounded-sm flex items-center justify-center font-bold text-white shadow-sm font-mono text-sm shrink-0"
                          style={{ backgroundColor: p.color || '#ffabf3' }}
                        >
                          {p.name[0].toUpperCase()}
                        </span>
                        <div className="flex flex-col items-start min-w-0">
                          <span className="font-mono text-xs font-bold text-[#f4dcec] truncate w-full max-w-[100px] xs:max-w-[120px] sm:max-w-[180px]" title={p.name}>
                            {p.name}
                          </span>
                          {(p.isHost || p.id === localPlayerId) && (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {p.isHost && (
                                <span className="font-mono text-[8px] bg-[#eab308]/20 border border-[#eab308]/40 text-[#eab308] px-1 py-0.5 rounded-sm font-bold flex items-center gap-0.5 shrink-0">
                                  <CrownIcon size={8} style={{ color: '#eab308' }} />
                                  {t('hostBadge')}
                                </span>
                              )}
                              {p.id === localPlayerId && (
                                <span className="font-mono text-[8px] bg-[#00fbfb]/20 border border-[#00fbfb]/40 text-[#00fbfb] px-1 py-0.5 rounded-sm font-bold shrink-0">
                                  {t('youBadge')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold ${p.isReady ? 'text-[#00fbfb] text-glow-cyan' : 'text-white/40'}`}>
                          {isViewingResults ? (
                            <>
                              <EyeIcon size={14} className="text-[#38bdf8]" />
                              <span>{t('viewingResults')}</span>
                            </>
                          ) : (
                            <>
                              {p.isReady ? (
                                <>
                                  <CheckIcon size={14} className="text-[#00fbfb] drop-shadow-[0_0_4px_#00fbfb]" />
                                  <span>{t('ready')}</span>
                                </>
                              ) : (
                                <>
                                  <HourglassIcon size={14} className="text-white/20 animate-pulse" />
                                  <span>{t('notReady')}</span>
                                </>
                              )}
                            </>
                          )}
                        </span>

                        {isHost && p.id !== localPlayerId && (
                          <button
                            className="w-5 h-5 bg-[#93000a]/20 border border-[#93000a]/50 text-red-400 hover:bg-[#93000a]/80 hover:text-white rounded-full flex items-center justify-center text-xs cursor-pointer transition-colors"
                            onClick={() => getSocket().emit('host:kick_player', { playerId: p.id })}
                            title={t('kickPlayer') || 'Kick Player'}
                            aria-label={`${t('kickPlayer') || 'Kick Player'} ${p.name}`}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty slots */}
                {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-3 border border-white/5 border-dashed bg-white/[0.01] opacity-40 flex items-center justify-between rounded-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 border border-white/10 rounded-sm flex items-center justify-center font-mono text-xs text-white/20">?</div>
                      <span className="font-mono text-xs italic text-white/30 tracking-wide">{t('waitingForPlayer') || 'Searching...'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="room-actions flex flex-col gap-3 mt-4">
                {!isHost && (
                  <button
                    id="btn-ready"
                    className={`game-btn font-mono group animate-pulse ${room.players.find((p) => p.id === localPlayerId)?.isReady
                        ? 'game-btn-magenta'
                        : 'game-btn-outline'
                      }`}
                    onClick={toggleReady}
                    style={{ justifyContent: 'center', gap: '8px' }}
                  >
                    {room.players.find((p) => p.id === localPlayerId)?.isReady ? (
                      <CheckIcon size={16} className="text-white drop-shadow-[0_0_4px_white]" />
                    ) : (
                      <PlayArrowIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
                    )}
                    <span>{room.players.find((p) => p.id === localPlayerId)?.isReady
                      ? t('notReadyBtn')
                      : t('readyBtn')}</span>
                  </button>
                )}

                {isHost && (
                  <button
                    id="btn-start"
                    className={`game-btn game-btn-cyan font-mono group animate-pulse ${(autoStartSeconds !== null && room.cancellationCount >= 3) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    onClick={autoStartSeconds !== null ? cancelStart : startGame}
                    disabled={autoStartSeconds !== null && room.cancellationCount >= 3}
                    style={{ justifyContent: 'center', gap: '8px' }}
                  >
                    {autoStartSeconds !== null ? (
                      <HourglassIcon size={16} className="animate-spin" />
                    ) : (
                      <PlayArrowIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
                    )}
                    <span>{autoStartSeconds !== null
                      ? room.cancellationCount >= 3
                        ? (lang === 'es' ? 'Inicio Inevitable' : 'Starting Soon')
                        : (lang === 'es' ? 'Cancelar' : 'Cancel')
                      : t('startGame')}</span>
                  </button>
                )}


                <p className={`room-footer-note ${autoStartSeconds ? 'auto-starting-note' : ''} text-center font-mono text-[9px] text-[#00fbfb]/60 uppercase tracking-wider mt-2`}>
                  {autoStartSeconds
                    ? t('autoStartingIn', { seconds: autoStartSeconds })
                    : isHost
                      ? room.players.length < 2
                        ? t('needMorePlayers')
                        : readyCount >= requiredCount
                          ? t('everyoneReady')
                          : t('waitingForReady', { count: requiredCount - readyCount })
                      : t('hostWillStart')}
                </p>
              </div>

              {/* Room ID decoration footer */}
              <div className="mt-4 flex justify-between items-center opacity-30">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#ffabf3]/40"></div>
                <div className="px-4 font-mono text-[8px] text-[#ffabf3] tracking-[0.4em] uppercase font-bold">ROOM ID: #{room.id}</div>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#ffabf3]/40"></div>
              </div>
            </div>
          </div>

        </div>



        {/* Global Floating Chat Widget */}
        <ChatOverlay inGame={false} />

        {/* Modern Glassmorphic Settings Modal */}
        {isSettingsOpen && (
          (() => {
            const activeSettings = draftSettings || room?.settings || {
              maxColors: 6,
              gameSpeed: 'NORMAL' as const,
              isBlindMode: false,
              maxLives: 3,
              suddenDeathMode: 'NORMAL' as const,
              enableCollisions: false,
              maxPlayers: 8
            };
            return (
              <div className="settings-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title">
                <div className="settings-modal-card">
                  {/* HUD Corner Brackets & Scanlines for Retro-Futurism vibe */}
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
                    {/* Sidebar Navigation */}
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
                      <button
                        className={`settings-tab-btn ${activeTab === 'players' ? 'active' : ''}`}
                        onClick={() => setActiveTab('players')}
                      >
                        <span className="tab-icon" style={{ display: 'flex', alignItems: 'center' }}><UsersIcon size={16} /></span>
                        <span className="tab-label">{t('tabPlayers')}</span>
                      </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="settings-content-area" style={{ maxHeight: '380px', overflowY: 'auto', minHeight: 0, paddingRight: '8px' }}>
                      {activeTab === 'difficulty' && (
                        <div className="settings-tab-content fade-in">
                          <h4 className="settings-modal-subtitle">{t('activeColorsLabel')}</h4>
                          <p className="settings-modal-intro">{t('activeColorsDesc')}</p>

                          <div className="difficulty-tiers-list">
                            {/* Easy Tier Card */}
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

                            {/* Normal Tier Card */}
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

                            {/* Hard Tier Card */}
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

                            {/* Extreme Tier Card */}
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
                            {/* Chill Speed */}
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

                            {/* Normal Speed */}
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

                            {/* Turbo Speed */}
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

                            {/* Player Collisions Toggle Modifier */}
                            <button
                              className={`difficulty-tier-btn tier--normal ${activeSettings.enableCollisions ? 'active' : ''}`}
                              onClick={() => updateDraftSettings({ enableCollisions: !activeSettings.enableCollisions })}
                            >
                              <div className="tier-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="tier-icon" style={{ display: 'flex', alignItems: 'center' }}><UsersIcon size={16} /></span>
                                <span className="tier-name">{t('collisionsLabel')}</span>
                              </div>
                              <p className="tier-desc">
                                {activeSettings.enableCollisions ? t('collisionsEnabledDesc') : t('collisionsDisabledDesc')}
                              </p>
                            </button>
                          </div>

                          {/* Collapsible Sudden Death Trigger Header */}
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
                              {/* Status Badge */}
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

                              {/* Collapse Arrow */}
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

                          {/* Collapsible Content Area */}
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

                      {activeTab === 'players' && (
                        <div className="settings-tab-content fade-in" style={{ paddingBottom: '24px' }}>
                          <h4 className="settings-modal-subtitle">{t('playersTitle')}</h4>
                          <p className="settings-modal-description">
                            {t('playersDesc')}
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '15px', fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--c-accent)' }}>
                              {t('maxPlayersLabel')}:
                              <select
                                className="lobby-input"
                                style={{
                                  width: '90px',
                                  padding: '6px',
                                  fontFamily: 'var(--font-display)',
                                  fontSize: '0.8rem',
                                  textAlign: 'center',
                                  margin: 0,
                                }}
                                value={activeSettings.maxPlayers || 8}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  updateDraftSettings({ maxPlayers: val });
                                }}
                              >
                                {(() => {
                                  const minVal = Math.max(2, room?.players.length ?? 0);
                                  const options = [];
                                  for (let n = minVal; n <= 12; n++) {
                                    options.push(
                                      <option key={n} value={n} style={{ background: 'var(--c-bg)', color: '#fff' }}>
                                        {n}
                                      </option>
                                    );
                                  }
                                  return options;
                                })()}
                              </select>
                            </label>

                            <p style={{ fontSize: '0.78rem', opacity: 0.7, lineHeight: '1.4' }}>
                              {t('maxPlayersHelp')}
                            </p>
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
                                  >
                                    {type === 'none' && (
                                      <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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
                                  const otherPlayers = room?.players.filter((p) => p.id !== localPlayerId) || [];
                                  const takenColors = otherPlayers.map((p) => (p.color || '').toLowerCase());

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
                                                          ? `⚠️ ¡El color "${getColorName(color, lang)}" ya está ocupado por otro jugador en esta sala!`
                                                          : `⚠️ The color "${getColorName(color, lang)}" is already taken by another player in this room!`,
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
      </div>
    </>
  );
}
