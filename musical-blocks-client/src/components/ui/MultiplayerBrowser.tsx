'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/src/lib/socketClient';
import { useGameStore } from '@/src/stores/gameStore';
import { useToastStore } from '@/src/stores/toastStore';
import { Room, RoomSummary } from '@/src/shared/types';
import { useTranslation } from '@/src/hooks/useTranslation';
import { BackArrowIcon, SpinnerIcon, MusicIcon } from './Icons';
import { MenuFooter } from './MenuFooter';
import { FloatingMusicNotes } from './FloatingMusicNotes';

// ---------------------------------------------------------------------------
//  Retro Inline Blocky Icons
// ---------------------------------------------------------------------------
const BoltIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path d="M11 2H19L14 11H20L9 22V13H4L11 2Z" fill="currentColor" />
  </svg>
);

const VpnKeyIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path d="M7 10C5.9 10 5 10.9 5 12C5 13.1 5.9 14 7 14C8.1 14 9 13.1 9 12C9 10.9 8.1 10 7 10ZM7 8C9.2 8 11 9.8 11 12C11 12.3 11 12.7 10.8 13H15V15H17V13H19V15H21V11H10.8C10 9.2 8.6 8 7 8Z" fill="currentColor" />
  </svg>
);

const AddCircleIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM17 13H13V17H11V13H7V11H11V7H13V11H17V13Z" fill="currentColor" />
  </svg>
);

// ---------------------------------------------------------------------------
//  MultiplayerBrowser — browse/create/join rooms (used at /multiplayer)
// ---------------------------------------------------------------------------
export function MultiplayerBrowser() {
  const store = useGameStore();
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState(store.localPlayerName || '');
  const [privateCode, setPrivateCode] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [publicRooms, setPublicRooms] = useState<RoomSummary[]>([]);
  const [step, setStep] = useState<'main' | 'join_private' | 'public_rooms'>('main');
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const currentState = useGameStore.getState();
    currentState.setGameMode('multiplayer');
    if (currentState.room) {
      import('@/src/lib/socketClient').then((m) => m.getSocket().emit('room:leave'));
      currentState.clearRoom();
    }
  }, []);

  useEffect(() => {
    if (store.connectionError) {
      setTimeout(() => setLoading(null), 0);
    }
  }, [store.connectionError]);

  const [prevStoreName, setPrevStoreName] = useState(store.localPlayerName);

  // Sync name input when store hydrates (adjusting state during render)
  if (store.localPlayerName !== prevStoreName) {
    setPrevStoreName(store.localPlayerName);
    setName(store.localPlayerName || '');
  }

  const nameValid = name.trim().length >= 2 && name.trim().length <= 16;

  const validateName = () => {
    if (name.trim().length === 0) {
      handleError(t('errNameFirst'));
      return false;
    }
    if (!nameValid) {
      handleError(t('errNameLength'));
      return false;
    }
    return true;
  };

  const handleError = (msg?: string) => {
    addToast(msg ?? t('errGeneric'), 'error');
    setLoading(null);
  };

  // Navigate to room page after joining
  const navigateToRoom = (room: Room) => {
    store.setRoom(room);
    router.push(`/multiplayer/${room.id.toUpperCase()}`);
  };

  // ---- Fetch public rooms
  const fetchRooms = () => {
    if (!validateName()) return;
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001'}/rooms`)
      .then((r) => r.json())
      .then((data: RoomSummary[]) => {
        setPublicRooms(data);
        setStep('public_rooms');
      })
      .catch(() => handleError(t('errFetchRooms')));
  };

  // ---- Quick join public (auto-match)
  const joinPublic = () => {
    if (!validateName()) return;
    store.setConnectionError(null);
    setLoading('public');
    store.setPlayerName(name.trim());
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit(
      'room:join_public',
      { playerName: name.trim() },
      (room: Room | null, err?: string) => {
        if (!room || err) { handleError(err); return; }
        store.setLocalPlayer(socket.id!, name.trim());
        setLoading(null);
        navigateToRoom(room);
      },
    );
  };

  // ---- Create private room
  const createPrivate = () => {
    if (!validateName()) return;
    store.setConnectionError(null);
    setLoading('create');
    store.setPlayerName(name.trim());
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit(
      'room:create',
      { playerName: name.trim(), visibility: 'private' },
      (room: Room) => {
        store.setLocalPlayer(socket.id!, name.trim());
        setLoading(null);
        navigateToRoom(room);
      },
    );
  };

  // ---- Join private by code
  const joinPrivate = () => {
    if (!validateName()) return;
    if (privateCode.trim().length !== 4) return handleError(t('errCodeLength'));
    store.setConnectionError(null);
    setLoading('private');
    store.setPlayerName(name.trim());
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit(
      'room:join_private',
      { playerName: name.trim(), code: privateCode.toUpperCase() },
      (room: Room | null, err?: string) => {
        if (!room || err) { handleError(err); return; }
        store.setLocalPlayer(socket.id!, name.trim());
        setLoading(null);
        navigateToRoom(room);
      },
    );
  };

  return (
    <>
      <main className="relative h-[100dvh] overflow-y-auto flex flex-col items-center justify-start md:justify-center p-4 pt-18 md:pt-0 pb-28 md:pb-12 md:p-12 z-[60] w-full bg-[#1c0f1a] select-none">
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

        {/* Custom Styles for Mobile Landscape */}
        <style>{`
        @media (max-height: 500px) and (orientation: landscape) {
          #multiplayer-browser {
            padding: 6px !important;
            padding-bottom: 28px !important;
            justify-content: center !important;
          }
          .mp-browser-container {
            max-width: 94vw !important;
            padding: 14px 24px !important;
          }
          .mp-main-wrap {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 24px !important;
            width: 100% !important;
          }
          .mp-col-left {
            width: 46% !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          .mp-col-right {
            width: 50% !important;
            margin-top: 0 !important;
            gap: 8px !important;
          }
          .mp-col-right button {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
          }
        }
      `}</style>

        {/* Central Multiplayer Panel */}
        <div className="game-card game-card-magenta start-container mp-browser-container z-20 p-6 md:p-8">
          {/* Back Button */}
          <button
            className="absolute top-5 left-5 text-[#ffabf3] font-retro text-xs md:text-sm font-bold uppercase tracking-widest bg-transparent border-none p-0 cursor-pointer z-20 flex items-center gap-2 hover:text-[#00fbfb] transition-all duration-300 group hover:drop-shadow-[0_0_8px_rgba(0,251,251,0.8)]"
            onClick={() => {
              if (step === 'main') {
                router.push('/');
              } else {
                setStep('main');
              }
            }}
          >
            <BackArrowIcon size={20} className="group-hover:-translate-x-1 transition-transform text-glow-cyan" />
            <span>{t('back').replace('← ', '')}</span>
          </button>

          {/* Corner Accents */}
          <div className="absolute -top-[2px] -left-[2px] w-5 h-5 border-t-4 border-l-4 border-[#ffabf3]/40"></div>
          <div className="absolute -top-[2px] -right-[2px] w-5 h-5 border-t-4 border-r-4 border-[#ffabf3]/40"></div>
          <div className="absolute -bottom-[2px] -left-[2px] w-5 h-5 border-b-4 border-l-4 border-[#ffabf3]/40"></div>
          <div className="absolute -bottom-[2px] -right-[2px] w-5 h-5 border-b-4 border-r-4 border-[#ffabf3]/40"></div>

          {step === 'main' ? (
            <>
              <div className="mp-main-wrap flex flex-col items-center w-full mt-0">
                {/* Left Column (Header & Name Input) */}
                <div className="mp-col-left flex flex-col items-center w-full">
                  {/* Header */}
                  <div className="text-center mt-2 mb-4 w-full">
                    {/* Micro-Branding Label */}
                    <div className="flex items-center justify-center gap-1.5 mb-1 opacity-60">
                      <MusicIcon size={12} className="text-[#ffabf3] pixel-note" />
                      <span className="font-display text-[9px] tracking-[0.3em] text-[#f4dcec] uppercase">
                        Voxel Rave
                      </span>
                    </div>
                    <h1 className="font-display text-2xl md:text-3xl text-[#ffabf3] tracking-[0.2em] uppercase mb-1 text-glow-magenta">
                      {t('multiplayer')}
                    </h1>
                    <p className="font-mono text-[10px] text-[#00fbfb]/60 uppercase tracking-widest">
                      {t('establishingRoomLink')}
                    </p>
                  </div>

                  {/* Player Name Input */}
                  <div className="flex flex-col gap-2 w-full mb-2">
                    <label className="block text-center font-mono text-[11px] text-[#ffabf3] uppercase tracking-[0.3em] mb-1">
                      {t('yourName')}
                    </label>
                    <div className="relative w-full">
                      <input
                        className="game-input game-input-magenta placeholder-[#ffabf3]/20"
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
                        maxLength={16}
                        onKeyDown={(e) => e.key === 'Enter' && joinPublic()}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column (Action Buttons) */}
                <div className="mp-col-right flex flex-col gap-3 w-full mt-4 md:mt-6">
                  <button
                    className="game-btn game-btn-cyan group"
                    onClick={joinPublic}
                    disabled={!!loading}
                  >
                    <span>{loading === 'public' ? t('joining') : t('quickJoin')}</span>
                    {loading === 'public' ? (
                      <SpinnerIcon className="animate-spin" size={20} />
                    ) : (
                      <BoltIcon size={20} className="group-hover:scale-125 transition-transform" />
                    )}
                  </button>

                  <button
                    className="game-btn game-btn-magenta group"
                    onClick={() => {
                      if (!validateName()) return;
                      setStep('join_private');
                    }}
                    disabled={!!loading}
                  >
                    <span>{t('joinPrivate')}</span>
                    <VpnKeyIcon size={20} className="group-hover:scale-125 transition-transform" />
                  </button>

                  <button
                    className="game-btn game-btn-outline group"
                    onClick={createPrivate}
                    disabled={!!loading}
                  >
                    <span>{loading === 'create' ? t('creating') : t('createPrivate')}</span>
                    {loading === 'create' ? (
                      <SpinnerIcon className="animate-spin" size={20} />
                    ) : (
                      <AddCircleIcon size={20} className="group-hover:rotate-90 transition-transform" />
                    )}
                  </button>
                </div>
              </div>

              {/* Browse Rooms Link */}
              <div className="mt-4 text-center">
                <button
                  className="text-[#ffabf3] hover:text-[#00fbfb] text-xs font-bold font-retro tracking-[0.2em] transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(0,251,251,0.6)]"
                  onClick={fetchRooms}
                >
                  {t('browseRooms')}
                </button>
              </div>
            </>
          ) : step === 'join_private' ? (
            <div className="flex flex-col w-full gap-6 mt-6">
              <div className="text-center mb-4">
                <p className="font-mono text-xs text-[#00fbfb]/60 uppercase tracking-widest">
                  {t('joinRoomSub')}
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full mb-2">
                <label className="block text-center font-mono text-[11px] text-[#ffabf3] uppercase tracking-[0.3em] mb-1">
                  {t('roomCode')}
                </label>
                <input
                  id="private-room-code"
                  className="game-input game-input-magenta text-center uppercase tracking-[0.3em] placeholder-[#ffabf3]/20"
                  type="text"
                  placeholder={t('codePlaceholder')}
                  maxLength={4}
                  autoFocus
                  value={privateCode}
                  onChange={(e) => setPrivateCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && joinPrivate()}
                />
                <p className="font-mono text-[10px] text-[#f4dcec]/40 text-center mt-2">
                  {t('codeHelp')}
                </p>
              </div>

              <div className="flex flex-col gap-4 w-full mt-10">
                <button
                  className="game-btn game-btn-cyan justify-center gap-2"
                  onClick={joinPrivate}
                  disabled={privateCode.length !== 4 || !!loading}
                >
                  {loading === 'private' ? (
                    <>
                      <SpinnerIcon className="animate-spin" size={16} />
                      <span>{t('connecting')}</span>
                    </>
                  ) : (
                    <span>{t('join')}</span>
                  )}
                </button>

              </div>
            </div>
          ) : (
            <div className="flex flex-col w-full gap-6 mt-6">
              {publicRooms.length > 0 && (
                <div className="text-center mb-4">
                  <p className="font-mono text-xs text-[#00fbfb]/60 uppercase tracking-widest">
                    {t('gameSubtitle')}
                  </p>
                </div>
              )}

              <div className="max-h-[260px] overflow-y-auto space-y-3 pr-2 scrollbar-custom w-full">
                {publicRooms.length === 0 ? (
                  <div className="text-center py-8 font-mono text-xs text-[#f4dcec]/40">
                    {t('noPublicRooms')}
                  </div>
                ) : (
                  publicRooms.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-4 bg-black/60 border border-[#ffabf3]/20 hover:border-[#ffabf3]/50 rounded transition-all duration-300"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-sm font-bold text-[#f4dcec]">
                          {r.hostName}
                        </span>
                        <span className="font-mono text-[10px] text-[#00fbfb]/60 uppercase tracking-wider">
                          {r.playerCount}/{r.maxPlayers} Players
                        </span>
                      </div>
                      <button
                        className="w-auto h-9 px-4 text-[11px] font-bold uppercase rounded cursor-pointer game-btn game-btn-cyan"
                        disabled={r.status !== 'waiting' || r.playerCount >= r.maxPlayers}
                        onClick={() => {
                          store.setPlayerName(name.trim());
                          const socket = getSocket();
                          if (!socket.connected) socket.connect();
                          socket.emit('room:join_public', { playerName: name.trim() }, (room: Room | null, err?: string) => {
                            if (room) {
                              store.setLocalPlayer(socket.id!, name.trim());
                              navigateToRoom(room);
                            } else {
                              handleError(err);
                            }
                          });
                        }}
                      >
                        {t('join')}
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
        </div>

        {/* Color Bar Decal */}
        <div className="mt-10 w-full max-w-[200px] grid grid-cols-3 gap-0 h-[2px] opacity-35 z-20">
          <div className="bg-[#ffabf3]"></div>
          <div className="bg-[#f4dcec]"></div>
          <div className="bg-[#cdcd00]"></div>
        </div>
      </main>
      <MenuFooter />
    </>
  );
}
