'use client';

import { useGameStore } from '@/src/stores/gameStore';
import { getSocket } from '@/src/lib/socketClient';
import { spawnParticles } from '../canvas/ParticleSystem';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/src/hooks/useTranslation';

// ---------------------------------------------------------------------------
//  GameOverScreen — shown when local player dies (spectating)
// ---------------------------------------------------------------------------
export function GameOverScreen() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="spectator-banner">
      <div className="spectator-banner-icon">👻</div>
      <div className="spectator-banner-text">
        <h3 className="spectator-title">{t('youFell')}</h3>
        <p className="spectator-sub">{t('spectating')}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  WinnerScreen — shown when game ends
// ---------------------------------------------------------------------------
export function WinnerScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const store = useGameStore();
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(15);

  const winner = gameState?.players.find((p) => p.id === gameState.winnerId);
  const isLocalWinner = gameState?.winnerId === localPlayerId;
  const isHost = store.room?.hostId === localPlayerId;

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Spawn confetti once on mount
  useEffect(() => {
    spawnParticles({
      x: 0,
      y: 10,
      z: 0,
      color: winner?.color ?? '#ffffff',
      count: 200,
      type: 'confetti'
    });
  }, [winner?.color]);

  return (
    <div className="overlay overlay--winner">
      {/* Confetti-like background */}
      <div className="confetti-bg" aria-hidden />

      <div className="overlay-card overlay-card--winner">
        <div className="overlay-header">
          {isLocalWinner ? (
            <>
              <div className="overlay-icon">👑</div>
              <h2 className="overlay-title">{t('victory')}</h2>
              <p className="overlay-sub">{t('youWon')}</p>
            </>
          ) : (
            <>
              <div className="overlay-icon">🏁</div>
              <h2 className="overlay-title">{t('gameOver')}</h2>
              <p className="overlay-sub">
                {winner ? t('winnerIs', { name: winner.name }) : t('nobodyWon')}
              </p>
            </>
          )}
        </div>
        <div className="overlay-content-wrapper">
          {winner && (
            <p className="overlay-winner-name">
              <span style={{ color: winner.color }}>★</span>{' '}
              {winner.name}
            </p>
          )}
          
          <p className="overlay-countdown" style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
            {t('autoReturnIn', { seconds: countdown.toString() }) || `Returning to lobby in ${countdown}s...`}
          </p>

          <div className="overlay-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              id="btn-back-lobby"
              className="lobby-btn lobby-btn--primary overlay-play-again"
              onClick={() => {
                if (isHost) {
                  getSocket().emit('host:back_to_lobby');
                } else {
                  getSocket().emit('player:return_lobby');
                  useGameStore.setState({ screen: 'lobby' });
                }
              }}
            >
              {t('backToLobby')}
            </button>
            <button
              id="btn-leave-room"
              className="lobby-btn lobby-btn--secondary overlay-play-again"
              onClick={() => {
                store.clearRoom();
                getSocket().emit('room:leave');
              }}
            >
              {t('leaveRoom')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
