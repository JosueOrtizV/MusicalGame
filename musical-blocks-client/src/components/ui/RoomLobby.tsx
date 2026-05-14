'use client';

import { useRef, useEffect } from 'react';
import { useGameStore, selectIsHost } from '@/src/stores/gameStore';
import { getSocket } from '@/src/lib/socketClient';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useToastStore } from '@/src/stores/toastStore';

// ---------------------------------------------------------------------------
//  RoomLobby — waiting room after joining / creating a room
// ---------------------------------------------------------------------------
export function RoomLobby() {
  const room = useGameStore((s) => s.room);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const isHost = useGameStore(selectIsHost);
  const store = useGameStore();
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const prevPlayersRef = useRef(room?.players ?? []);

  useEffect(() => {
    if (!room) return;
    const currentPlayers = room.players;
    const prevIds = new Set(prevPlayersRef.current.map((p) => p.id));
    
    const newPlayers = currentPlayers.filter((p) => !prevIds.has(p.id));
    newPlayers.forEach((p) => {
      if (p.id !== localPlayerId) {
        addToast(t('playerJoined', { name: p.name }), 'success');
      }
    });

    prevPlayersRef.current = currentPlayers;
  }, [room, localPlayerId, t, addToast]);

  if (!room) return null;

  const isPrivate = room.visibility === 'private';
  const canStart = isHost && room.players.length >= 2;

  const toggleReady = () => {
    const me = room.players.find((p) => p.id === localPlayerId);
    getSocket().emit('player:ready', { ready: !me?.isReady });
  };

  const startGame = () => {
    getSocket().emit('host:start_game');
  };

  const leaveRoom = () => {
    getSocket().emit('room:leave');
    store.clearRoom();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.id);
  };

  return (
    <div className="room-lobby-bg">
      <div className="room-lobby-card">
        {/* Header */}
        <div className="room-header">
          <h2 className="room-title">
            {isPrivate ? t('privateRoom', { id: room.id }) : t('publicRoom')}
          </h2>
          {isPrivate && (
            <button className="room-code-badge" onClick={copyCode} title="Click to copy">
              <span className="room-code-text">{room.id}</span>
              <span className="room-code-copy">📋</span>
            </button>
          )}
          <p className="room-hint">
            {isPrivate ? t('shareCodeHint') : t('waitingPlayersHint')}
          </p>
        </div>

        {/* Room Content Wrapper */}
        <div className="room-content-wrapper">
          {/* Player list */}
          <div className="room-players">
            {room.players.map((p) => {
              const isViewingResults = room.status === 'finished' && !p.hasReturnedToLobby;
              return (
                <div key={p.id} className="room-player-row" style={{ opacity: isViewingResults ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                  <span
                    className="room-player-avatar"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name[0].toUpperCase()}
                  </span>
                  <span className="room-player-name">
                    {p.name}
                    {p.isHost && <span className="room-host-badge"> {t('hostBadge')}</span>}
                    {p.id === localPlayerId && <span className="room-you-badge"> {t('youBadge')}</span>}
                  </span>
                  <span className={`room-ready-badge ${p.isReady ? 'ready' : 'not-ready'}`}>
                    {isViewingResults ? (
                      <>
                        <span className="room-status-emoji">👀</span>
                        <span className="room-status-text">{t('viewingResults')}</span>
                      </>
                    ) : (
                      <>
                        <span className="room-status-emoji">{p.isReady ? '✅' : '⌛'}</span>
                        <span className="room-status-text">{p.isReady ? t('ready').replace('✅', '').trim() : t('notReady').replace('⌛', '').trim()}</span>
                      </>
                    )}
                  </span>

                  {isHost && p.id !== localPlayerId && (
                    <button
                      className="room-kick-btn"
                      onClick={() => getSocket().emit('host:kick_player', { playerId: p.id })}
                      title={t('kickPlayer') || 'Kick Player'}
                    >
                      &times;
                    </button>
                  )}
                </div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="room-player-row room-player-empty">
                <span className="room-player-avatar room-avatar-empty">?</span>
                <span className="room-player-name room-name-empty">{t('waitingForPlayer')}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="room-actions">
            {!isHost && (
              <button
                id="btn-ready"
                className="room-btn room-btn--ready"
                onClick={toggleReady}
              >
                {room.players.find((p) => p.id === localPlayerId)?.isReady
                  ? t('notReadyBtn')
                  : t('readyBtn')}
              </button>
            )}

            {isHost && (
              <button
                id="btn-start"
                className={`room-btn room-btn--start ${!canStart ? 'disabled' : ''}`}
                onClick={startGame}
                disabled={!canStart}
              >
                {t('startGame')}
              </button>
            )}

            <button className="room-btn room-btn--leave" onClick={leaveRoom}>
              {t('leaveRoom')}
            </button>

            <p className="room-footer-note">
              {isHost
                ? room.players.length < 2
                  ? t('waitingPlayersHint')
                  : t('everyoneReady')
                : t('hostWillStart')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
