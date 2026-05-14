'use client';

import { useState } from 'react';
import { getSocket } from '@/src/lib/socketClient';
import { useGameStore } from '@/src/stores/gameStore';
import { useToastStore } from '@/src/stores/toastStore';
import { Room, RoomSummary } from '@/src/shared/types';

import { useTranslation } from '@/src/hooks/useTranslation';

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
  const [step, setStep] = useState<'main' | 'join_private' | 'public_rooms'>('main');
  const addToast = useToastStore((s) => s.addToast);

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
      <div className="lobby-particles" aria-hidden />

      <div className="lobby-card">
        {step === 'main' ? (
          <>
            {/* Logo */}
            <div className="lobby-logo">
              <span className="logo-emoji">🎵</span>
              <h1 className="logo-title">{t('gameTitle')}</h1>
              <p className="logo-sub">{t('gameSubtitle')}</p>
            </div>

            {/* Main Content Wrapper */}
            <div className="lobby-content-wrapper">
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
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinPublic()}
                />
              </div>

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
            </div>
          </>
        ) : step === 'join_private' ? (
          <>
            {/* Join Private Step */}
            <div className="lobby-logo">
              <span className="logo-emoji">🔑</span>
              <h1 className="logo-title">{t('joinRoomTitle')}</h1>
              <p className="logo-sub">{t('joinRoomSub')}</p>
            </div>

            {/* Join Private Step Content Wrapper */}
            <div className="lobby-content-wrapper">
              <div className="lobby-section lobby-section--centered">
                <label className="lobby-label">{t('roomCode')}</label>
                <input
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
              >
                {loading === 'private' ? t('connecting') : t('join')}
              </button>

              <button
                className="lobby-btn lobby-btn--secondary"
                onClick={() => setStep('main')}
                disabled={!!loading}
              >
                {t('back')}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Public Rooms Step */}
            <div className="lobby-logo">
              <span className="logo-emoji">🌐</span>
              <h1 className="logo-title">{t('activeRooms')}</h1>
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
