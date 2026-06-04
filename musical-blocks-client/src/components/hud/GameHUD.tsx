'use client';

import { useEffect, useState } from 'react';
import { useGameStore, selectPhase } from '@/src/stores/gameStore';
import { COLOR_HEX, Direction } from '@/src/shared/types';
import { getSocket, serverNow } from '@/src/lib/socketClient';
import { useTranslation, DictKey } from '@/src/hooks/useTranslation';
import { ChatOverlay } from './ChatOverlay';
import { VolumeMuteIcon, VolumeUpIcon, HeartIcon, SkullIcon, EyeIcon } from '../ui/Icons';

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
  const [isPlayersExpanded, setIsPlayersExpanded] = useState(true);

  // Collapse player list by default on mobile screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      const t = setTimeout(() => {
        setIsPlayersExpanded(false);
      }, 0);
      return () => clearTimeout(t);
    }
  }, []);

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

  const { timeLeft, winnerColor, players, round } = gameState;
  const playersWithLives = players.filter((p) => p.lives > 0);
  
  // Perfectly sync visual danger color with audio beeps at exactly 3 seconds!
  const isUrgent = timeLeft <= 3 && phase === 'ANNOUNCING';

  // Dynamic round and difficulty color mapping helper
  const GET_ROUND_COLOR = (r: number): string => {
    if (r <= 2) return '#00f0ff'; // Cian (Fácil)
    if (r <= 4) return '#39ff14'; // Verde Neón (Normal)
    if (r <= 6) return '#ffff00'; // Amarillo (Difícil)
    return '#f43f5e'; // Rojo/Rosa Neón (Extremo/Caos)
  };

  // Determine active dynamic accent
  const activeAccent = isUrgent
    ? '#f43f5e'
    : (phase === 'ANNOUNCING' && winnerColor)
      ? COLOR_HEX[winnerColor]
      : GET_ROUND_COLOR(round);

  let phaseTitle = '';
  if (phase === 'STARTING') phaseTitle = t('phaseStarting');
  if (phase === 'DANCING') phaseTitle = t('phaseDancing');
  if (phase === 'ANNOUNCING') phaseTitle = t('phaseAnnouncing');
  if (phase === 'ELIMINATING') phaseTitle = t('phaseEliminating');
  if (phase === 'ROUND_END') phaseTitle = t('phaseRoundEnd');

  return (
    <>
      <div 
        className="hud-overlay"
        style={{
          '--c-dynamic-accent': activeAccent,
        } as React.CSSProperties}
      >
        {/* ---- Round banner ------------------------------------------------- */}
        {showBanner && (
          <div className="hud-banner animate-banner" data-text={bannerText}>
            {bannerText}
            <span className="hud-banner-sub">{t('survive')}</span>
          </div>
        )}

        {/* ---- Mute Toggle -------------------------------------------------- */}
        <button 
          className="hud-mute-btn" 
          onClick={toggleMute} 
          title="Toggle Audio"
          aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          aria-pressed={isMuted}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isMuted ? <VolumeMuteIcon size={18} /> : <VolumeUpIcon size={18} />}
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
        <div className={`hud-players ${isPlayersExpanded ? 'expanded' : ''}`}>
          <div className="hud-players-title" onClick={() => setIsPlayersExpanded(!isPlayersExpanded)}>
            <span>{t('alivePlayers', { alive: playersWithLives.length, total: players.length })}</span>
            <span className="hud-players-toggle-icon">▼</span>
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
                <span className="hud-player-lives" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#f43f5e', fontWeight: 'bold' }}>
                  <HeartIcon size={11} style={{ fill: '#f43f5e' }} />
                  <span>x{p.lives}</span>
                </span>
              ) : (
                <span className="hud-player-skull" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                  <SkullIcon size={12} style={{ color: '#94a3b8' }} />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ---- Mobile D-pad ------------------------------------------------- */}
        <MobileDPad />

        {/* ---- Round info --------------------------------------------------- */}
        {gameState.round > 0 && <div className="hud-round">{t('roundNumber', { round: gameState.round })}</div>}
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
      <div className="hud-dpad-spectator" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <EyeIcon size={16} style={{ color: '#38bdf8' }} />
        <span>Spectating</span>
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
    <div className="hud-dpad" role="group" aria-label="Directional controls">
      <button
        className={`dpad-btn dpad-up ${pressed.UP ? 'dpad-btn--active' : ''}`}
        onPointerDown={(e) => handleInteraction(e, 'UP')}
        aria-label="Move Up"
      >▲</button>
      <button
        className={`dpad-btn dpad-left ${pressed.LEFT ? 'dpad-btn--active' : ''}`}
        onPointerDown={(e) => handleInteraction(e, 'LEFT')}
        aria-label="Move Left"
      >◀</button>
      <button
        className={`dpad-btn dpad-right ${pressed.RIGHT ? 'dpad-btn--active' : ''}`}
        onPointerDown={(e) => handleInteraction(e, 'RIGHT')}
        aria-label="Move Right"
      >▶</button>
      <button
        className={`dpad-btn dpad-down ${pressed.DOWN ? 'dpad-btn--active' : ''}`}
        onPointerDown={(e) => handleInteraction(e, 'DOWN')}
        aria-label="Move Down"
      >▼</button>
    </div>
  );
}

