'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/src/lib/socketClient';
import { useGameStore } from '@/src/stores/gameStore';
import { useToastStore } from '@/src/stores/toastStore';
import { Room, RoomSummary } from '@/src/shared/types';

import { useTranslation } from '@/src/hooks/useTranslation';
import { SpinnerIcon, MusicIcon, LockIcon, GlobeIcon } from './Icons';
import { fetchTopScores, LeaderboardEntry } from '@/src/lib/supabase/leaderboard';

// ---------------------------------------------------------------------------
//  LobbyScreen — home screen + room selection
// ---------------------------------------------------------------------------
export function LobbyScreen() {
  const store = useGameStore();
  const { t } = useTranslation();
  const [name, setName] = useState(store.localPlayerName || '');
  const [privateCode, setPrivateCode] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [publicRooms, setPublicRooms] = useState<RoomSummary[]>([]);
  const [step, setStep] = useState<'mode_select' | 'sp_config' | 'main' | 'join_private' | 'public_rooms'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) return 'main';
    }
    return store.gameMode === 'singleplayer' ? 'sp_config' : 'mode_select';
  });
  const [pendingDirectJoinCode, setPendingDirectJoinCode] = useState<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const [spDifficulty, setSpDifficulty] = useState<'easy' | 'normal' | 'hard' | 'extreme'>('normal');
  const [spSpeed, setSpSpeed] = useState<'CHILL' | 'NORMAL' | 'TURBO'>('NORMAL');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);

  const [prevStoreName, setPrevStoreName] = useState(store.localPlayerName);

  // Sync name input when store hydrates (adjusting state during render)
  if (store.localPlayerName !== prevStoreName) {
    setPrevStoreName(store.localPlayerName);
    setName(store.localPlayerName || '');
  }

  const clearUrlQuery = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };

  const autoJoinDirect = (playerName: string, code: string) => {
    store.setConnectionError(null);
    setLoading('direct');
    store.setPlayerName(playerName);
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit(
      'room:join_private',
      { playerName, code },
      (room: Room | null, err?: string) => {
        if (!room || err) {
          clearUrlQuery();
          setPendingDirectJoinCode(null);
          addToast(err || t('errRoomFullOrInvalid', { code }), 'error');
          setLoading(null);
          return;
        }
        store.setRoom(room);
        store.setLocalPlayer(socket.id!, playerName);
        clearUrlQuery();
        setLoading(null);
      },
    );
  };

  const handleDirectJoinSubmit = () => {
    if (!validateName()) return;
    if (pendingDirectJoinCode) {
      autoJoinDirect(name.trim(), pendingDirectJoinCode);
    }
  };

  const cancelDirectJoin = () => {
    clearUrlQuery();
    setPendingDirectJoinCode(null);
    setPrivateCode('');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const code = roomParam.trim().toUpperCase();
      if (code.length === 4 && /^[A-Z0-9]{4}$/.test(code)) {
        setTimeout(() => {
          setPendingDirectJoinCode(code);
          setPrivateCode(code);
        }, 0);

        const savedName = store.localPlayerName ? store.localPlayerName.trim() : '';
        if (savedName.length >= 2 && savedName.length <= 16) {
          setTimeout(() => {
            autoJoinDirect(savedName, code);
          }, 0);
        } else {
          setTimeout(() => {
            const nameInput = document.getElementById('player-name') as HTMLInputElement;
            if (nameInput) nameInput.focus();
          }, 150);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== 'sp_config') return;

    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      setLoadingLeaderboard(true);
      fetchTopScores(10).then((data) => {
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
  }, [step]);

  useEffect(() => {
    if (store.connectionError) {
      setTimeout(() => setLoading(null), 0);
    }
  }, [store.connectionError]);

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
        store.setRoom(room);
        store.setLocalPlayer(socket.id!, name.trim());
        setLoading(null);
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
        store.setRoom(room);
        store.setLocalPlayer(socket.id!, name.trim());
        setLoading(null);
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
        store.setRoom(room);
        store.setLocalPlayer(socket.id!, name.trim());
        setLoading(null);
      },
    );
  };

  return (
    <div className="lobby-bg">
      <div className="lobby-particles" aria-hidden="true" />

      <div className="lobby-card">
        {/* HUD Corner Brackets & Scanlines for the authentic retro-arcade cockpit feel */}
        <span className="hud-corner top-left" aria-hidden="true"></span>
        <span className="hud-corner top-right" aria-hidden="true"></span>
        <span className="hud-corner bottom-left" aria-hidden="true"></span>
        <span className="hud-corner bottom-right" aria-hidden="true"></span>
        <div className="hud-scanlines" aria-hidden="true"></div>

        {loading === 'direct' ? (
          <div className="lobby-logo" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <span className="logo-emoji" style={{ color: 'var(--c-accent)' }}><SpinnerIcon size={48} /></span>
            <h2 className="logo-title">{t('loading')}</h2>
            <p className="logo-sub">{t('joiningRoomSpinner', { code: pendingDirectJoinCode || '' })}</p>
          </div>
        ) : step === 'mode_select' ? (
          <>
            <div className="lobby-logo">
              <span className="logo-emoji" style={{ color: 'var(--c-accent)' }}><MusicIcon size={48} /></span>
              <h1 className="logo-title">{t('gameTitle')}</h1>
              <p className="logo-sub">{t('gameSubtitle')}</p>
            </div>
            
            <div className="lobby-content-wrapper" style={{ marginTop: '1.5rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                textAlign: 'center',
                marginBottom: '1.5rem',
                color: 'var(--c-accent-2)'
              }}>{t('modeSelectTitle')}</h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '1rem',
                width: '100%'
              }}>
                <button
                  className="lobby-btn lobby-btn--primary"
                  style={{
                    height: 'auto',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    store.setGameMode('singleplayer');
                    setStep('sp_config');
                  }}
                >
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>👤 {t('singlePlayer')}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 400 }}>
                    Práctica solo, sin esperas
                  </span>
                  {store.spHighScore > 0 && (
                    <span style={{ fontSize: '0.7rem', color: '#eab308', marginTop: '0.2rem' }}>
                      🏆 Récord: {store.spHighScore} pts
                    </span>
                  )}
                </button>
                
                <button
                  className="lobby-btn lobby-btn--accent"
                  style={{
                    height: 'auto',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    store.setGameMode('multiplayer');
                    setStep('main');
                  }}
                >
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>👥 {t('multiplayer')}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 400 }}>
                    Juega online con amigos
                  </span>
                </button>
              </div>
            </div>
          </>
        ) : step === 'sp_config' ? (
          <>
            <div className="lobby-logo">
              <span className="logo-emoji" style={{ color: 'var(--c-accent)' }}><MusicIcon size={48} /></span>
              <h2 className="logo-title">{t('singlePlayer')}</h2>
              <p className="logo-sub">{t('gameSubtitle')}</p>
            </div>

            <div className="lobby-content-wrapper" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
              {/* Name input */}
              <div className="lobby-section">
                <label className="lobby-label" htmlFor="player-name">{t('yourName')}</label>
                <input
                  id="player-name"
                  className="lobby-input"
                  type="text"
                  placeholder={t('namePlaceholder')}
                  maxLength={16}
                  value={name}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 16) {
                      setName(val);
                    } else {
                      setName(val.slice(0, 16));
                    }
                  }}
                />
              </div>

              {/* Difficulty Selection */}
              <div className="lobby-section" style={{ marginBottom: '1rem' }}>
                <label className="lobby-label">{t('difficulty')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
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
                      className="lobby-btn"
                      style={{
                        padding: '0.5rem 0',
                        fontSize: '0.75rem',
                        height: 'auto',
                        background: spDifficulty === diff.key ? 'var(--c-accent)' : 'rgba(255,255,255,0.05)',
                        border: spDifficulty === diff.key ? '1px solid var(--c-accent)' : '1px solid rgba(255,255,255,0.1)',
                        color: spDifficulty === diff.key ? '#000' : '#fff',
                        fontWeight: spDifficulty === diff.key ? '800' : '400',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSpDifficulty(diff.key)}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed Selection */}
              <div className="lobby-section" style={{ marginBottom: '1rem' }}>
                <label className="lobby-label">{t('speed')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {(['CHILL', 'NORMAL', 'TURBO'] as const).map((spd) => (
                    <button
                      key={spd}
                      className="lobby-btn"
                      style={{
                        padding: '0.5rem 0',
                        fontSize: '0.75rem',
                        height: 'auto',
                        background: spSpeed === spd ? 'var(--c-accent-2)' : 'rgba(255,255,255,0.05)',
                        border: spSpeed === spd ? '1px solid var(--c-accent-2)' : '1px solid rgba(255,255,255,0.1)',
                        color: spSpeed === spd ? '#000' : '#fff',
                        fontWeight: spSpeed === spd ? '800' : '400',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSpSpeed(spd)}
                    >
                      {spd}
                    </button>
                  ))}
                </div>
              </div>

              {/* High Score Local */}
              {store.spHighScore > 0 && (
                <div style={{
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius)',
                  textAlign: 'center',
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                  color: '#eab308'
                }}>
                  🏆 {t('highScore')}: <strong>{store.spHighScore} pts</strong>
                </div>
              )}

              {/* Leaderboard Global Widget */}
              <div style={{
                background: 'rgba(5, 5, 20, 0.5)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '0.8rem',
                borderRadius: 'var(--radius)',
                marginBottom: '1.2rem',
                maxHeight: '180px',
                overflowY: 'auto'
              }}>
                <h4 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.8rem',
                  color: 'var(--c-accent)',
                  marginBottom: '0.5rem',
                  textAlign: 'center',
                  letterSpacing: '0.05em'
                }}>🏆 {t('globalLeaderboard')}</h4>
                
                {loadingLeaderboard ? (
                  <p style={{ fontSize: '0.75rem', color: '#aaa', textAlign: 'center' }}>{t('leaderboardLoading')}</p>
                ) : leaderboard.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: '#777', textAlign: 'center' }}>No records yet. Be the first!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          padding: '3px 6px',
                          background: entry.player_id === store.spPlayerId ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                          borderRadius: '3px',
                          border: entry.player_id === store.spPlayerId ? '1px solid rgba(0, 240, 255, 0.3)' : 'none'
                        }}
                      >
                        <span style={{ color: index === 0 ? '#eab308' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                          {index + 1}. <strong>{entry.name}</strong>
                          <span style={{ fontSize: '0.6rem', color: '#888', marginLeft: '6px' }}>
                            ({entry.difficulty.toUpperCase()} • {entry.speed})
                          </span>
                        </span>
                        <strong style={{ color: 'var(--c-accent)', flexShrink: 0 }}>{entry.score} pts</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <button
                className="lobby-btn lobby-btn--primary"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (!validateName()) return;
                  store.setPlayerName(name.trim());
                  
                  // Start single player
                  let diffColors = 6;
                  if (spDifficulty === 'easy') diffColors = 4;
                  else if (spDifficulty === 'normal') diffColors = 6;
                  else if (spDifficulty === 'hard') diffColors = 8;
                  else if (spDifficulty === 'extreme') diffColors = 10;
                  
                  window.dispatchEvent(new CustomEvent('sp:start', {
                    detail: { difficulty: diffColors, speed: spSpeed }
                  }));
                }}
              >
                ▶ {t('playSolo')}
              </button>

              <button
                className="lobby-btn lobby-btn--secondary"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setStep('mode_select');
                }}
              >
                {t('back')}
              </button>
            </div>
          </>
        ) : step === 'main' ? (
          <>
            {/* Logo */}
            <div className="lobby-logo">
              <span className="logo-emoji" style={{ color: 'var(--c-accent)' }}><MusicIcon size={48} /></span>
              <h1 className="logo-title">{t('gameTitle')}</h1>
              <p className="logo-sub">{t('gameSubtitle')}</p>
            </div>

            {/* Main Content Wrapper */}
            <div className="lobby-content-wrapper">
              {pendingDirectJoinCode && (
                <div className="direct-join-badge">
                  <span className="direct-join-text">
                    {t('joiningRoomDirect', { code: pendingDirectJoinCode })}
                  </span>
                </div>
              )}

              {/* Name input */}
              <div className="lobby-section">
                <label className="lobby-label" htmlFor="player-name">{t('yourName')}</label>
                <input
                  id="player-name"
                  className="lobby-input"
                  type="text"
                  placeholder={t('namePlaceholder')}
                  maxLength={16}
                  value={name}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 16) {
                      setName(val);
                    } else {
                      setName(val.slice(0, 16));
                    }
                  }}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    (pendingDirectJoinCode ? handleDirectJoinSubmit() : joinPublic())
                  }
                />
              </div>

              {pendingDirectJoinCode ? (
                <>
                  <button
                    className="lobby-btn lobby-btn--primary"
                    onClick={handleDirectJoinSubmit}
                    disabled={!!loading}
                  >
                    {t('join')}
                  </button>

                  <button
                    className="lobby-btn lobby-btn--secondary"
                    onClick={cancelDirectJoin}
                    disabled={!!loading}
                  >
                    {t('cancel')}
                  </button>
                </>
              ) : (
                <>
                  {/* Action buttons (Direct children for grid support) */}
                  <button
                    className="lobby-btn lobby-btn--primary"
                    onClick={joinPublic}
                    disabled={!!loading}
                  >
                    {loading === 'public' ? t('joining') : t('quickJoin')}
                  </button>

                  <button
                    className="lobby-btn lobby-btn--accent"
                    onClick={() => {
                      if (!validateName()) return;
                      setStep('join_private');
                    }}
                    disabled={!!loading}
                  >
                    {t('joinPrivate')}
                  </button>

                  <button
                    className="lobby-btn lobby-btn--secondary"
                    onClick={createPrivate}
                    disabled={!!loading}
                  >
                    {loading === 'create' ? t('creating') : t('createPrivate')}
                  </button>

                  <button
                    className="lobby-link"
                    onClick={fetchRooms}
                  >
                    {t('browseRooms')}
                  </button>
                </>
              )}
            </div>
          </>
        ) : step === 'join_private' ? (
          <>
            {/* Join Private Step */}
            <div className="lobby-logo">
              <span className="logo-emoji" style={{ color: 'var(--c-accent-2)' }}><LockIcon size={48} /></span>
              <h2 className="logo-title">{t('joinRoomTitle')}</h2>
              <p className="logo-sub">{t('joinRoomSub')}</p>
            </div>

            {/* Join Private Step Content Wrapper */}
            <div className="lobby-content-wrapper">
              <div className="lobby-section lobby-section--centered">
                <label className="lobby-label" htmlFor="private-room-code">{t('roomCode')}</label>
                <input
                  id="private-room-code"
                  className="lobby-input lobby-input--code"
                  type="text"
                  placeholder={t('codePlaceholder')}
                  maxLength={4}
                  autoFocus
                  value={privateCode}
                  onChange={(e) => setPrivateCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && joinPrivate()}
                />
                <p className="lobby-help">{t('codeHelp')}</p>
              </div>

              <button
                className="lobby-btn lobby-btn--primary"
                onClick={joinPrivate}
                disabled={privateCode.length !== 4 || !!loading}
                aria-label="Confirm private room code and join"
              >
                {loading === 'private' ? t('connecting') : t('join')}
              </button>

              <button
                className="lobby-btn lobby-btn--secondary"
                onClick={() => setStep('main')}
                disabled={!!loading}
                aria-label="Back to main lobby screen"
              >
                {t('back')}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Public Rooms Step */}
            <div className="lobby-logo">
              <span className="logo-emoji" style={{ color: 'var(--c-accent)' }}><GlobeIcon size={48} /></span>
              <h2 className="logo-title">{t('activeRooms')}</h2>
              <p className="logo-sub">{publicRooms.length > 0 ? t('gameSubtitle') : t('noPublicRooms')}</p>
            </div>

            <div className="lobby-content-wrapper">
              <div className="lobby-room-list-view">
                {publicRooms.map((r) => (
                  <div key={r.id} className="lobby-room-row">
                    <div className="room-info">
                      <span className="room-host">{r.hostName}</span>
                      <span className="room-count">{r.playerCount}/{r.maxPlayers}</span>
                    </div>
                    <button
                      className="room-join-btn"
                      disabled={r.status !== 'waiting' || r.playerCount >= r.maxPlayers}
                      aria-label={`Join room hosted by ${r.hostName}`}
                      onClick={() => {
                        store.setPlayerName(name.trim());
                        const socket = getSocket();
                        if (!socket.connected) socket.connect();
                        socket.emit('room:join_public', { playerName: name.trim() }, (room, err) => {
                          if (room) {
                            store.setRoom(room);
                            store.setLocalPlayer(socket.id!, name.trim());
                          } else {
                            handleError(err);
                          }
                        });
                      }}
                    >
                      {t('join')}
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="lobby-btn lobby-btn--secondary"
                onClick={() => setStep('main')}
                aria-label="Back to main lobby screen"
              >
                {t('back')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

