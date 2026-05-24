'use client';

import { useEffect, useState } from 'react';
import { useGameStore, selectPhase } from '@/src/stores/gameStore';
import { COLOR_HEX, Direction } from '@/src/shared/types';
import { getSocket, serverNow } from '@/src/lib/socketClient';
import { useTranslation, DictKey } from '@/src/hooks/useTranslation';
import { ChatOverlay } from './ChatOverlay';

// ---------------------------------------------------------------------------
//  HUD overlay — Timer, color indicator, player list, round banner
// ---------------------------------------------------------------------------
export function GameHUD() {
  const gameState = useGameStore((s) => s.gameState);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const isMuted = useGameStore((s) => s.isMuted);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const phase = useGameStore(selectPhase);
  const settings = useGameStore((s) => s.room?.settings);
  const { t } = useTranslation();

  const [showBanner, setShowBanner] = useState(false);
  const [bannerText, setBannerText] = useState('');

  // Show round banner on phase change
  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase === 'DANCING') {
      // Use a minimal timeout to avoid synchronous setState warning
      const t1 = setTimeout(() => {
        const suddenDeathMode = settings?.suddenDeathMode || 'NORMAL';
        const isSuddenDeath = suddenDeathMode === 'CHAOS' || (suddenDeathMode === 'NORMAL' && gameState.round >= 10);

        if (isSuddenDeath) {
          setBannerText(t('suddenDeath'));
        } else {
          setBannerText(t('roundNumber', { round: gameState.round }));
        }
        setShowBanner(true);
      }, 0);
      // If the dancing phase duration is 4s or less, show the banner for only 1.2s to prioritize gameplay visibility
      const bannerDuration = gameState.timeLeft <= 4 ? 1200 : 2500;
      const t2 = setTimeout(() => setShowBanner(false), bannerDuration);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (gameState.phase === 'ANNOUNCING') {
      // Also asynchronous to prevent cascading render warnings
      const t = setTimeout(() => setShowBanner(false), 0);
      return () => clearTimeout(t);
    }
  }, [gameState?.phase, gameState?.round, gameState, t, settings?.suddenDeathMode]);

  if (!gameState) return null;

  const { timeLeft, winnerColor, players } = gameState;
  const playersWithLives = players.filter((p) => p.lives > 0);
  
  // Perfectly sync visual danger color with audio beeps at exactly 3 seconds!
  const isUrgent = timeLeft <= 3 && phase === 'ANNOUNCING';

  let phaseTitle = '';
  if (phase === 'STARTING') phaseTitle = t('phaseStarting');
  if (phase === 'DANCING') phaseTitle = t('phaseDancing');
  if (phase === 'ANNOUNCING') phaseTitle = t('phaseAnnouncing');
  if (phase === 'ELIMINATING') phaseTitle = t('phaseEliminating');
  if (phase === 'ROUND_END') phaseTitle = t('phaseRoundEnd');

  return (
    <>
      <div className="hud-overlay">
        {/* ---- Round banner ------------------------------------------------- */}
        {showBanner && (
          <div className="hud-banner animate-banner" data-text={bannerText}>
            {bannerText}
            <span className="hud-banner-sub">{t('survive')}</span>
          </div>
        )}

        {/* ---- Mute Toggle -------------------------------------------------- */}
        <button className="hud-mute-btn" onClick={toggleMute} title="Toggle Audio">
          {isMuted ? '🔇' : '🔊'}
        </button>

        {/* ---- ANNOUNCING overlay ------------------------------------------- */}
        {phase === 'ANNOUNCING' && winnerColor && (
          <div className="hud-announce">
            <p className="hud-announce-label">{t('saveYourself')}</p>
            <div className="hud-announce-color">
              <div
                className="hud-color-block"
                style={{ backgroundColor: COLOR_HEX[winnerColor] }}
              />
              <p className="hud-color-name">{t(winnerColor as DictKey)}</p>
            </div>
          </div>
        )}

        {/* ---- Timer -------------------------------------------------------- */}
        {(phase === 'DANCING' || phase === 'ANNOUNCING') && (
          <div className={`hud-timer ${isUrgent ? 'hud-timer--urgent' : ''}`}>
            {timeLeft}
          </div>
        )}

        {/* ---- Phase label -------------------------------------------------- */}
        <div className="hud-phase">
          {phaseTitle}
        </div>

        {/* ---- Player list -------------------------------------------------- */}
        <div className="hud-players">
          <div className="hud-players-title">
            {t('alivePlayers', { alive: playersWithLives.length, total: players.length })}
          </div>
          {players.map((p) => (
            <div
              key={p.id}
              className={`hud-player-row ${!p.isAlive ? 'hud-player-dead' : ''} ${p.id === localPlayerId ? 'hud-player-local' : ''}`}
            >
              <span
                className="hud-player-dot"
                style={{ backgroundColor: p.color }}
              />
              <span className="hud-player-name">
                {p.id === localPlayerId ? '★ ' : ''}{p.name}
              </span>
              {p.lives > 0 ? (
                <span className="hud-player-lives" style={{ marginLeft: 'auto', fontSize: '11px', color: '#f43f5e', fontWeight: 'bold' }}>
                  ❤️ x{p.lives}
                </span>
              ) : (
                <span className="hud-player-skull" style={{ marginLeft: 'auto' }}>💀</span>
              )}
            </div>
          ))}
        </div>

        {/* ---- Mobile D-pad ------------------------------------------------- */}
        <MobileDPad />

        {/* ---- Round info --------------------------------------------------- */}
        {gameState.round > 0 && <div className="hud-round">Round {gameState.round}</div>}
      </div>

      {/* ---- Chat (Outside hud-overlay wrapper to avoid pointer-events: none and capped z-index) ---- */}
      <ChatOverlay inGame={true} />
    </>
  );
}

// ---------------------------------------------------------------------------
//  Mobile virtual D-pad
// ---------------------------------------------------------------------------
function MobileDPad() {
  const phase = useGameStore((s) => s.gameState?.phase);
  const pressed = useGameStore((s) => s.pressedDirections);
  const screen = useGameStore((s) => s.screen);

  if (screen === 'dead') {
    return (
      <div className="hud-dpad-spectator">
        <span className="spectator-eye">👁️</span> Spectating
      </div>
    );
  }

  const handleInteraction = (e: React.SyntheticEvent, dir: Direction) => {
    // Detener scroll, zoom y propagación al canvas
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    if (phase !== 'DANCING' && phase !== 'ANNOUNCING') return;

    getSocket().emit('player:move', { direction: dir, timestamp: serverNow() });
  };

  return (
    <div className="hud-dpad">
      <button
        className={`dpad-btn dpad-up ${pressed.UP ? 'dpad-btn--active' : ''}`}
        onPointerDown={(e) => handleInteraction(e, 'UP')}
      >▲</button>
      <button
        className={`dpad-btn dpad-left ${pressed.LEFT ? 'dpad-btn--active' : ''}`}
        onPointerDown={(e) => handleInteraction(e, 'LEFT')}
      >◀</button>
      <button
        className={`dpad-btn dpad-right ${pressed.RIGHT ? 'dpad-btn--active' : ''}`}
        onPointerDown={(e) => handleInteraction(e, 'RIGHT')}
      >▶</button>
      <button
        className={`dpad-btn dpad-down ${pressed.DOWN ? 'dpad-btn--active' : ''}`}
        onPointerDown={(e) => handleInteraction(e, 'DOWN')}
      >▼</button>
    </div>
  );
}
