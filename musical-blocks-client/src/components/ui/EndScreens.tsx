'use client';

import { useGameStore } from '@/src/stores/gameStore';
import { getSocket } from '@/src/lib/socketClient';
import { spawnParticles } from '../canvas/ParticleSystem';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/src/hooks/useTranslation';
import { GhostIcon, CrownIcon, FlagIcon } from './Icons';
import { hexToRgba } from '@/src/lib/colorUtils';
import { useRouter } from 'next/navigation';

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
    <div className="overlay overlay--gameover" role="alert">
      <div className="overlay-card overlay-card--gameover">
        <div className="overlay-icon animate-pulse" style={{ display: 'flex', justifyContent: 'center', color: '#ef4444' }}>
          <GhostIcon size={48} />
        </div>
        <h2 className="overlay-title">{t('youFell')}</h2>
        <p className="overlay-sub">{t('spectating')}</p>
      </div>
    </div>
  );
}



// ---------------------------------------------------------------------------
//  SinglePlayerEndScreen — shown when game over in single player
// ---------------------------------------------------------------------------
export function SinglePlayerEndScreen() {
  const store = useGameStore();
  const { t } = useTranslation();
  const spLastScore = store.spLastScore;
  const spLastRounds = store.spLastRounds;
  const spLastRank = store.spLastRank;
  const spLastDiffRank = store.spLastDiffRank;
  const isSubmittingScore = store.isSubmittingScore;
  const isNewHighScore = spLastScore > 0 && spLastScore === store.spHighScore;

  return (
    <div className="overlay overlay--winner" role="dialog" aria-modal="true">
      <div className="confetti-bg" aria-hidden="true" />

      <div className="overlay-card overlay-card--winner">
        <span className="hud-corner top-left" aria-hidden="true"></span>
        <span className="hud-corner top-right" aria-hidden="true"></span>
        <span className="hud-corner bottom-left" aria-hidden="true"></span>
        <span className="hud-corner bottom-right" aria-hidden="true"></span>
        <div className="hud-scanlines" aria-hidden="true"></div>

        <div className="overlay-header">
          <div className="overlay-icon" style={{ display: 'flex', justifyContent: 'center', color: isNewHighScore ? '#eab308' : '#ef4444' }}>
            {isNewHighScore ? <CrownIcon size={48} /> : <FlagIcon size={48} />}
          </div>
          <h2 className="overlay-title">
            {isNewHighScore ? t('newRecord') : t('spGameOver')}
          </h2>
          <p className="overlay-sub" style={{ fontSize: '1.2rem', marginTop: '0.8rem', color: '#fff' }}>
            {t('finalScore', { score: '___SCORE___' }).split('___SCORE___')[0]}
            <span style={{ color: '#eab308', fontWeight: 800, textShadow: '0 0 10px rgba(234, 179, 8, 0.6)' }}>
              {spLastScore}
            </span>
            {t('finalScore', { score: '___SCORE___' }).split('___SCORE___')[1]}
          </p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.4rem' }}>
            {t('roundsSurvived', { rounds: spLastRounds })}
          </p>

          {isSubmittingScore ? (
            <div style={{ 
              marginTop: '1rem', 
              fontFamily: 'var(--font-retro)', 
              fontSize: '0.85rem', 
              color: '#38bdf8', 
              letterSpacing: '0.05em',
              animation: 'pulse 1.5s infinite' 
            }}>
              {store.language === 'es' ? '[ VERIFICANDO RANGO GLOBAL... ]' : '[ VERIFYING GLOBAL RANK... ]'}
            </div>
          ) : spLastRank !== null ? (
            <div style={{ 
              marginTop: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.3rem',
              animation: 'rankAppear 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
            }}>
              {spLastRank <= 10 ? (
                <div style={{
                  color: '#eab308',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  textShadow: '0 0 10px rgba(234, 179, 8, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  🏆 {store.language === 'es' ? `¡TOP #${spLastRank} GLOBAL!` : `TOP #${spLastRank} GLOBAL!`}
                </div>
              ) : spLastRank <= 100 ? (
                <div style={{
                  color: '#22c55e',
                  fontFamily: 'var(--font-retro)',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  textShadow: '0 0 8px rgba(34, 197, 94, 0.5)'
                }}>
                  {store.language === 'es' ? `RANGO GLOBAL: #${spLastRank}` : `GLOBAL RANK: #${spLastRank}`}
                </div>
              ) : (
                <div style={{
                  color: '#94a3b8',
                  fontFamily: 'var(--font-retro)',
                  fontSize: '0.9rem',
                  opacity: 0.9
                }}>
                  {store.language === 'es' ? `Posición Global: #${spLastRank}` : `Global Position: #${spLastRank}`}
                </div>
              )}

              {/* Rango por Dificultad */}
              {spLastRank > 10 && spLastDiffRank !== null && spLastDiffRank <= 50 && (
                <div style={{
                  color: '#38bdf8',
                  fontFamily: 'var(--font-retro)',
                  fontSize: '0.8rem',
                  opacity: 0.9,
                  textShadow: '0 0 5px rgba(56, 189, 248, 0.3)'
                }}>
                  {store.language === 'es' 
                    ? `Top #${spLastDiffRank} en ${store.spSettings.maxColors <= 4 ? 'Fácil' : store.spSettings.maxColors <= 6 ? 'Normal' : store.spSettings.maxColors <= 8 ? 'Difícil' : 'Experto'}`
                    : `Top #${spLastDiffRank} in ${store.spSettings.maxColors <= 4 ? 'Easy' : store.spSettings.maxColors <= 6 ? 'Normal' : store.spSettings.maxColors <= 8 ? 'Hard' : 'Expert'}`
                  }
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="overlay-content-wrapper">
          <div className="overlay-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', marginTop: '1.5rem' }}>
            <button
              className="lobby-btn lobby-btn--primary"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                const settings = store.spSettings;
                window.dispatchEvent(new CustomEvent('sp:start', {
                  detail: { settings }
                }));
              }}
            >
              ◀ {t('playAgain')}
            </button>
            
            <button
              className="lobby-btn lobby-btn--secondary"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                useGameStore.setState({ screen: 'home' });
              }}
            >
              {t('backToMenu')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  WinnerScreen — shown when game ends
// ---------------------------------------------------------------------------
export function WinnerScreen() {
  const gameMode = useGameStore((s) => s.gameMode);
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

  // Countdown timer starts immediately on mount to stay perfectly in sync with the server's 15s timeout
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

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

  if (gameMode === 'singleplayer') {
    return <SinglePlayerEndScreen />;
  }

  // While the card is not yet visible, render an unobstructed view with a premium top banner
  if (!isCardVisible) {
    return (
      <div className="victory-top-banner" role="alert">
        {winner ? t('victoryBanner', { name: winner.name }) : t('gameOverBanner')}
      </div>
    );
  }

  return (
    <div className="overlay overlay--winner" role="dialog" aria-modal="true" aria-labelledby="winner-dialog-title">
      {/* Confetti-like background */}
      <div className="confetti-bg" aria-hidden="true" />

      <div className="overlay-card overlay-card--winner">
        {/* HUD Corner Brackets & Scanlines for the authentic arcade victory screen */}
        <span className="hud-corner top-left" aria-hidden="true"></span>
        <span className="hud-corner top-right" aria-hidden="true"></span>
        <span className="hud-corner bottom-left" aria-hidden="true"></span>
        <span className="hud-corner bottom-right" aria-hidden="true"></span>
        <div className="hud-scanlines" aria-hidden="true"></div>

        <div className="overlay-header">
          {isLocalWinner ? (
            <>
              <div className="overlay-icon" style={{ display: 'flex', justifyContent: 'center', color: '#eab308' }}><CrownIcon size={48} /></div>
              <h2 className="overlay-title" id="winner-dialog-title">{t('victory')}</h2>
              <p className="overlay-sub">{t('youWon')}</p>
            </>
          ) : (
            <>
              <div className="overlay-icon" style={{ display: 'flex', justifyContent: 'center', color: '#ef4444' }}><FlagIcon size={48} /></div>
              <h2 className="overlay-title" id="winner-dialog-title">{t('gameOver')}</h2>
              <p className="overlay-sub" style={{ fontSize: '1.1rem', marginTop: '0.8rem', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {winner ? t('winnerIs', { name: winner.name }) : t('nobodyWon')}
              </p>
            </>
          )}
        </div>


        <div className="overlay-content-wrapper">
          {winner && (
            <div className="overlay-winner-display" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
               <div className="winner-name-badge" style={{ 
                 display: 'inline-flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 flexWrap: 'wrap',
                 gap: '0.3rem',
                 padding: '0.5rem clamp(1rem, 4vw, 2.2rem)',
                 background: `linear-gradient(135deg, rgba(20, 20, 47, 0.9) 0%, ${hexToRgba(winner.color, 0.15)} 100%)`,
                 borderRadius: 'var(--radius)',
                 border: `2px solid ${winner.color}`,
                 boxShadow: `0 0 20px ${hexToRgba(winner.color, 0.55)}, inset 0 0 10px ${hexToRgba(winner.color, 0.25)}`,
                 fontSize: 'clamp(1rem, 4.5vw, 1.4rem)',
                 fontWeight: 800,
                 margin: '1.5rem 0',
                 textShadow: `0 0 10px ${winner.color}`,
                 color: '#fff',
                 fontFamily: 'var(--font-display)',
                 transition: 'all 0.3s ease',
                 maxWidth: '100%',
                 boxSizing: 'border-box',
               }}>
                 <span style={{ 
                   color: winner.color, 
                   marginRight: '0.2rem', 
                   fontSize: 'clamp(1.1rem, 5vw, 1.5rem)',
                   textShadow: `0 0 8px ${winner.color}`,
                   flexShrink: 0,
                 }}>★</span>
                 <span style={{
                   whiteSpace: 'normal',
                   wordBreak: 'break-word',
                   display: 'inline-block',
                   minWidth: 0,
                   maxWidth: '100%',
                   textAlign: 'center',
                 }}>
                   {winner.name}
                 </span>
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
