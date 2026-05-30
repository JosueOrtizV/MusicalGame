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
  const [isCardVisible, setIsCardVisible] = useState(false);

  const winner = gameState?.players.find((p) => p.id === gameState.winnerId);
  const isLocalWinner = gameState?.winnerId === localPlayerId;
  const isHost = store.room?.hostId === localPlayerId;

  // Delay victory card appearance so the 3D winner celebration is fully visible first
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCardVisible(true);
    }, 4500); // 4.5s delay of pure unobstructed 3D celebration
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer starts only when the card is visible
  useEffect(() => {
    if (!isCardVisible) return;
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, isCardVisible]);

  // Spawn initial burst of confetti once card displays
  useEffect(() => {
    if (isCardVisible && winner?.color) {
      spawnParticles({
        x: 0,
        y: 10,
        z: 0,
        color: winner.color,
        count: 200,
        type: 'confetti'
      });
    }
  }, [isCardVisible, winner?.color]);

  // While the card is not yet visible, render an unobstructed view with a premium top banner
  if (!isCardVisible) {
    return (
      <div className="victory-top-banner">
        {winner ? t('victoryBanner', { name: winner.name }) : t('gameOverBanner')}
      </div>
    );
  }

  return (
    <div className="overlay overlay--winner">
      {/* Confetti-like background */}
      <div className="confetti-bg" aria-hidden />

      <div className="overlay-card overlay-card--winner">
        {/* HUD Corner Brackets & Scanlines for the authentic arcade victory screen */}
        <span className="hud-corner top-left"></span>
        <span className="hud-corner top-right"></span>
        <span className="hud-corner bottom-left"></span>
        <span className="hud-corner bottom-right"></span>
        <div className="hud-scanlines"></div>

        <div className="overlay-header">
          {isLocalWinner ? (
            <>
              <div className="overlay-icon">🏆</div>
              <h2 className="overlay-title">{t('victory')}</h2>
              <p className="overlay-sub">{t('youWon')}</p>
            </>
          ) : (
            <>
              <div className="overlay-icon">🏁</div>
              <h2 className="overlay-title">{t('gameOver')}</h2>
              <p className="overlay-sub" style={{ fontSize: '1.1rem', marginTop: '0.8rem' }}>
                {winner ? t('winnerIs', { name: winner.name }) : t('nobodyWon')}
              </p>
            </>
          )}
        </div>

        <div className="overlay-content-wrapper">
          {winner && (
            <div className="overlay-winner-display">
               <div className="winner-name-badge" style={{ 
                 display: 'inline-block',
                 padding: '0.5rem 1.5rem',
                 background: 'rgba(20, 20, 47, 0.85)',
                 borderRadius: 'var(--radius)',
                 border: '1px solid var(--c-accent-2)',
                 boxShadow: 'var(--glow-rose)',
                 fontSize: '1.4rem',
                 fontWeight: 800,
                 margin: '1.5rem 0',
                 textShadow: '0 0 10px var(--c-accent-2)'
               }}>
                 <span style={{ color: winner.color, marginRight: '0.5rem' }}>★</span>
                 {winner.name}
               </div>
            </div>
          )}
          
          <div className="overlay-timer-section">
            <p className="overlay-countdown">
              {t('autoReturnIn', { seconds: countdown.toString() }) || `Lobby in ${countdown}s`}
            </p>
          </div>

          <div className="overlay-actions">
            <button
              id="btn-back-lobby"
              className="lobby-btn lobby-btn--primary"
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
              className="lobby-btn lobby-btn--secondary"
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
