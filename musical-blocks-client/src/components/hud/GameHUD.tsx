'use client';

import { useEffect, useState, useRef } from 'react';
import { useGameStore, selectPhase } from '@/src/stores/gameStore';
import { COLOR_HEX, Direction } from '@/src/shared/types';
import { getSocket, serverNow } from '@/src/lib/socketClient';
import { useTranslation, DictKey } from '@/src/hooks/useTranslation';
import { ChatOverlay } from './ChatOverlay';
import { VolumeMuteIcon, VolumeUpIcon, HeartIcon, SkullIcon, EyeIcon, CameraMovableIcon, CameraStaticIcon, TrophyIcon } from '../ui/Icons';
import { computeDirection } from '@/src/hooks/usePlayerInput';

// ---------------------------------------------------------------------------
//  HUD overlay — Timer, color indicator, player list, round banner
// ---------------------------------------------------------------------------
export function GameHUD() {
  const gameState = useGameStore((s) => s.gameState);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const isMuted = useGameStore((s) => s.isMuted);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const hasSelectedCameraMode = useGameStore((s) => s.hasSelectedCameraMode);
  const phase = useGameStore(selectPhase);
  const settings = useGameStore((s) => s.room?.settings);
  const gameMode = useGameStore((s) => s.gameMode);
  const spLastScore = useGameStore((s) => s.spLastScore);
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

        {/* ---- Camera Toggle ------------------------------------------------ */}
        <button 
          className="hud-camera-btn" 
          onClick={() => setCameraMode(cameraMode === 'movable' ? 'static' : 'movable')} 
          title={cameraMode === 'movable' ? t('cameraModeMovable') : t('cameraModeStatic')}
          aria-label={cameraMode === 'movable' ? t('cameraModeMovable') : t('cameraModeStatic')}
          aria-pressed={cameraMode === 'static'}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {cameraMode === 'movable' ? <CameraMovableIcon size={18} /> : <CameraStaticIcon size={18} />}
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

        {/* ---- Mobile Controls --------------------------------------------- */}
        <MobileControls />

        {/* ---- PC Dash Cooldown Indicator ---------------------------------- */}
        <PcDashIndicator />

        {/* ---- Pointer Lock Prompt ----------------------------------------- */}
        <PointerLockPrompt />

        {/* ---- Round & Score info ------------------------------------------- */}
        {gameState.round > 0 && (
          <div className="hud-round flex items-center gap-1.5 font-mono">
            {/* Round display (Desktop / Mobile) */}
            <span className="hidden md:inline">
              {t('roundNumber', { round: gameState.round })}
            </span>
            <span className="inline md:hidden">
              R{gameState.round}
            </span>

            {/* Score display if Singleplayer */}
            {gameMode === 'singleplayer' && (
              <>
                <span className="opacity-40"> - </span>
                <span className="flex items-center gap-1">
                  <TrophyIcon size={13} className="text-[#eaea00] text-glow-cyan" />
                  <span className="hidden md:inline">{t('score')}: </span>
                  <span className="text-[#eaea00] text-glow-cyan">{spLastScore}</span>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ---- Chat (Outside hud-overlay wrapper to avoid pointer-events: none and capped z-index) ---- */}
      <ChatOverlay inGame={true} />

      {!hasSelectedCameraMode && <CameraSelectionModal />}
    </>
  );
}

// ---------------------------------------------------------------------------
//  PC Dash cooldown indicator (bottom-right on desktop only)
// ---------------------------------------------------------------------------
function PcDashIndicator() {
  const dashCooldownEnd = useGameStore((s) => s.dashCooldownEnd);
  const phase = useGameStore((s) => s.gameState?.phase);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Handle cooldown timer asynchronously to keep render pure and avoid cascading renders
  useEffect(() => {
    let animFrame: number;
    
    const tick = () => {
      const remaining = Math.max(0, dashCooldownEnd - Date.now());
      setCooldownLeft(remaining);
      if (remaining > 0) {
        animFrame = requestAnimationFrame(tick);
      }
    };

    const remaining = Math.max(0, dashCooldownEnd - Date.now());
    if (remaining > 0) {
      animFrame = requestAnimationFrame(tick);
    } else {
      animFrame = requestAnimationFrame(() => setCooldownLeft(0));
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [dashCooldownEnd]);

  // Only show on PC, during gameplay
  if (isMobile) return null;
  if (phase !== 'DANCING' && phase !== 'ANNOUNCING') return null;

  const pct = cooldownLeft / 5000;
  const onCooldown = cooldownLeft > 0;

  return (
    <div style={{
      position: 'absolute',
      bottom: '2rem',
      right: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      pointerEvents: 'none',
      zIndex: 10000,
    }}>
      {/* Circular icon */}
      <div style={{
        position: 'relative',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: onCooldown
          ? 'linear-gradient(135deg, #555 0%, #333 100%)'
          : 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
        border: '2px solid rgba(255,255,255,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        filter: onCooldown ? 'grayscale(0.5) brightness(0.7)' : 'none',
        boxShadow: onCooldown ? 'none' : '0 0 15px rgba(244, 63, 94, 0.5)',
        transition: 'filter 0.3s, box-shadow 0.3s',
      }}>
        {/* Bolt icon */}
        <svg viewBox="0 0 24 24" width="26" height="26" fill="white" style={{
          opacity: onCooldown ? 0.4 : 1,
          transition: 'opacity 0.3s',
        }}>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        {/* Conic gradient overlay */}
        {onCooldown && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            borderRadius: '50%',
            background: `conic-gradient(rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.55) ${pct * 100}%, transparent ${pct * 100}%, transparent 100%)`,
            transform: 'rotate(-90deg)',
            pointerEvents: 'none',
          }} />
        )}
        {/* Cooldown number */}
        {onCooldown && (
          <span style={{
            position: 'absolute',
            fontSize: '1.1rem',
            fontWeight: 800,
            color: '#fff',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            fontFamily: 'monospace',
          }}>
            {(cooldownLeft / 1000).toFixed(1)}
          </span>
        )}
      </div>
      {/* Keybind label */}
      <span style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        background: 'rgba(0,0,0,0.4)',
        padding: '2px 8px',
        borderRadius: '4px',
      }}>
        SPACE
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Mobile virtual D-pad
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
//  Mobile virtual controls
// ---------------------------------------------------------------------------
function DashButton({ onDash }: { onDash: () => void }) {
  const dashCooldownEnd = useGameStore((s) => s.dashCooldownEnd);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [isReadyFlash, setIsReadyFlash] = useState(false);

  // Handle cooldown timer asynchronously to keep render pure and avoid cascading renders
  useEffect(() => {
    let animFrame: number;
    
    const tick = () => {
      const remaining = Math.max(0, dashCooldownEnd - Date.now());
      setCooldownLeft(remaining);
      if (remaining > 0) {
        animFrame = requestAnimationFrame(tick);
      } else {
        setIsReadyFlash(true);
        setTimeout(() => setIsReadyFlash(false), 500);
      }
    };

    const remaining = Math.max(0, dashCooldownEnd - Date.now());
    if (remaining > 0) {
      animFrame = requestAnimationFrame(tick);
    } else {
      animFrame = requestAnimationFrame(() => setCooldownLeft(0));
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [dashCooldownEnd]);

  const handlePress = (e: React.PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    // Ignore if on cooldown
    if (Date.now() < dashCooldownEnd) return;

    // Trigger dash and start cooldown via store
    useGameStore.getState().triggerDashCooldown();
    onDash();
  };

  const pct = cooldownLeft / 5000; // 0 to 1
  const secondsText = (cooldownLeft / 1000).toFixed(1);

  return (
    <button
      onPointerDown={handlePress}
      style={{
        pointerEvents: 'auto',
        position: 'relative',
        background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
        border: '2px solid #ffffff',
        borderRadius: '50%',
        width: '76px',
        height: '76px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: cooldownLeft > 0 
          ? 'none' 
          : 'var(--glow-rose), 0 5px 20px rgba(244, 63, 94, 0.5)',
        cursor: cooldownLeft > 0 ? 'not-allowed' : 'pointer',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        overflow: 'hidden',
        transition: 'transform 0.1s ease',
        transform: cooldownLeft > 0 ? 'scale(0.95)' : 'scale(1)',
        filter: cooldownLeft > 0 ? 'grayscale(0.7) brightness(0.6)' : 'none',
        animation: isReadyFlash ? 'dash-ready-flash 0.5s ease-out' : cooldownLeft > 0 ? 'none' : 'dash-pulse 2s infinite alternate',
      }}
    >
      {/* SVG Lightning Bolt Icon */}
      <svg 
        viewBox="0 0 24 24" 
        width="34" 
        height="34" 
        fill="currentColor"
        style={{
          transition: 'transform 0.2s',
          transform: cooldownLeft > 0 ? 'scale(0.8)' : 'scale(1)',
        }}
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>

      {/* Cooldown Overlay Clockwise Radial wipe */}
      {cooldownLeft > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `conic-gradient(rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.6) ${pct * 100}%, transparent ${pct * 100}%, transparent 100%)`,
            pointerEvents: 'none',
            transform: 'rotate(-90deg)', // start from top
          }}
        />
      )}

      {/* Cooldown Number Overlay */}
      {cooldownLeft > 0 && (
        <span
          style={{
            position: 'absolute',
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#ffffff',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}
        >
          {secondsText}
        </span>
      )}
    </button>
  );
}

function MobileControls() {
  const screen = useGameStore((s) => s.screen);
  const phase = useGameStore((s) => s.gameState?.phase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const mobileControlType = useGameStore((s) => s.mobileControlType);
  const gameMode = useGameStore((s) => s.gameMode);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) return null;

  if (screen === 'dead') {
    return (
      <div 
        className="hud-dpad-spectator" 
        style={{ 
          position: 'absolute',
          bottom: '2rem',
          right: '1.5rem',
          background: 'rgba(15, 15, 35, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--radius)',
          padding: '0.75rem 1.25rem',
          color: 'var(--c-text)',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: 'var(--glow-purple)',
          zIndex: 10000,
          animation: 'modal-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}
      >
        <EyeIcon size={16} style={{ color: '#38bdf8' }} />
        <span>Spectating</span>
      </div>
    );
  }

  const handleDash = () => {
    if (phase !== 'DANCING' && phase !== 'ANNOUNCING') return;

    const isAlive = gameMode === 'singleplayer'
      ? useGameStore.getState().gameState?.players[0]?.isAlive
      : (localPlayerId ? useGameStore.getState().gameState?.players.find(p => p.id === localPlayerId)?.isAlive : false);
    if (!isAlive) return;

    const pressed = useGameStore.getState().pressedDirections;
    const cameraYaw = useGameStore.getState().cameraYaw;
    let baseDir = computeDirection(pressed, cameraYaw);
    if (!baseDir) {
      baseDir = computeDirection({ UP: true, DOWN: false, LEFT: false, RIGHT: false }, cameraYaw) || 'UP';
    }

    const dashDir = `DASH_${baseDir}` as Direction;
    
    if (gameMode === 'singleplayer') {
      window.dispatchEvent(new CustomEvent('sp:move', { detail: { direction: dashDir } }));
    } else {
      if (!localPlayerId) return;
      getSocket().emit('player:move', { direction: dashDir, timestamp: serverNow() });
    }
  };

  return (
    <div 
      className="mobile-controls-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 'calc(100% - 3rem)',
        position: 'absolute',
        bottom: '2rem',
        left: '1.5rem',
        right: '1.5rem',
        pointerEvents: 'none',
        zIndex: 10000
      }}
    >
      {mobileControlType === 'wasd' ? <MobileWASD /> : <MobileJoystick />}
      <DashButton onDash={handleDash} />
    </div>
  );
}

function MobileJoystick() {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeTouch = useRef<number | null>(null);
  
  const DEAD_ZONE = 6;   // pixels
  const MAX_RADIUS = 40;  // pixels

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTouch.current !== null) return;
    
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    activeTouch.current = e.pointerId;
    
    updateJoystick(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeTouch.current !== e.pointerId) return;
    updateJoystick(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeTouch.current !== e.pointerId) return;
    
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    activeTouch.current = null;
    
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)';
    }

    const setDir = useGameStore.getState().setDirectionPressed;
    setDir('UP', false);
    setDir('DOWN', false);
    setDir('LEFT', false);
    setDir('RIGHT', false);
  };

  const updateJoystick = (e: React.PointerEvent) => {
    const joystick = joystickRef.current;
    if (!joystick) return;

    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const angle = Math.atan2(dy, dx);
    
    const limitedDist = Math.min(distance, MAX_RADIUS);
    const knobX = Math.cos(angle) * limitedDist;
    const knobY = Math.sin(angle) * limitedDist;

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }

    const setDir = useGameStore.getState().setDirectionPressed;

    if (distance < DEAD_ZONE) {
      setDir('UP', false);
      setDir('DOWN', false);
      setDir('LEFT', false);
      setDir('RIGHT', false);
      return;
    }

    const deg = (angle * 180) / Math.PI;

    const isRight = deg > -67.5 && deg < 67.5;
    const isLeft = deg > 112.5 || deg < -112.5;
    const isDown = deg > 22.5 && deg < 157.5;
    const isUp = deg > -157.5 && deg < -22.5;

    setDir('UP', isUp);
    setDir('DOWN', isDown);
    setDir('LEFT', isLeft);
    setDir('RIGHT', isRight);
  };

  return (
    <div
      className="mobile-joystick"
      ref={joystickRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        pointerEvents: 'auto',
        width: '110px',
        height: '110px',
        background: 'rgba(5, 5, 20, 0.45)',
        backdropFilter: 'blur(28px) saturate(1.8)',
        border: '2px solid rgba(0, 240, 255, 0.35)',
        borderRadius: '50%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)',
        touchAction: 'none',
        userSelect: 'none'
      }}
    >
      <div 
        className="joystick-base"
        style={{
          width: '32px',
          height: '32px',
          background: 'rgba(0, 240, 255, 0.08)',
          border: '1px dashed rgba(0, 240, 255, 0.3)',
          borderRadius: '50%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div 
          className="joystick-knob" 
          ref={knobRef}
          style={{
            width: '44px',
            height: '44px',
            background: 'radial-gradient(circle, var(--c-accent-2) 0%, rgba(244, 63, 94, 0.85) 100%)',
            border: '2px solid #ffffff',
            borderRadius: '50%',
            position: 'absolute',
            boxShadow: 'var(--glow-rose), 0 0 15px rgba(244, 63, 94, 0.6)',
            cursor: 'pointer',
            touchAction: 'none',
            transition: 'transform 0.05s ease-out'
          }}
        />
      </div>
    </div>
  );
}

function MobileWASD() {
  const setDir = useGameStore((s) => s.setDirectionPressed);
  const pressed = useGameStore((s) => s.pressedDirections);

  const handlePress = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', active: boolean) => {
    setDir(dir, active);
  };

  return (
    <div className="mobile-dpad-container" style={{ pointerEvents: 'auto' }}>
      <button 
        className={`dpad-btn dpad-btn-up ${pressed.UP ? 'active' : ''}`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handlePress('UP', true); }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); handlePress('UP', false); }}
        onPointerLeave={() => handlePress('UP', false)}
        onPointerCancel={() => handlePress('UP', false)}
      >
        W
      </button>
      <button 
        className={`dpad-btn dpad-btn-left ${pressed.LEFT ? 'active' : ''}`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handlePress('LEFT', true); }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); handlePress('LEFT', false); }}
        onPointerLeave={() => handlePress('LEFT', false)}
        onPointerCancel={() => handlePress('LEFT', false)}
      >
        A
      </button>
      <button 
        className={`dpad-btn dpad-btn-down ${pressed.DOWN ? 'active' : ''}`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handlePress('DOWN', true); }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); handlePress('DOWN', false); }}
        onPointerLeave={() => handlePress('DOWN', false)}
        onPointerCancel={() => handlePress('DOWN', false)}
      >
        S
      </button>
      <button 
        className={`dpad-btn dpad-btn-right ${pressed.RIGHT ? 'active' : ''}`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handlePress('RIGHT', true); }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); handlePress('RIGHT', false); }}
        onPointerLeave={() => handlePress('RIGHT', false)}
        onPointerCancel={() => handlePress('RIGHT', false)}
      >
        D
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Pointer Lock click-to-activate prompt overlay (Desktop only)
// ---------------------------------------------------------------------------
function PointerLockPrompt() {
  const isPointerLocked = useGameStore((s) => s.isPointerLocked);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const phase = useGameStore(selectPhase);
  const language = useGameStore((s) => s.language);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) return null;
  if (cameraMode === 'static') return null;
  const isGameplay = phase === 'DANCING' || phase === 'ANNOUNCING' || phase === 'ELIMINATING' || phase === 'ROUND_END';
  if (!isGameplay) return null;
  if (isPointerLocked) return null;

  const promptText = language === 'es' 
    ? 'Haz clic para controlar la cámara' 
    : 'Click to control the camera';

  const subText = language === 'es'
    ? 'Usa el mouse para girar y WASD para moverte'
    : 'Use mouse to look around and WASD to move';

  const handleClick = () => {
    const container = document.querySelector('.game-canvas-container');
    if (container) {
      try {
        const promise = (container as HTMLElement).requestPointerLock();
        if (promise && typeof promise.catch === 'function') {
          promise.catch((err) => {
            console.debug('Pointer lock request deferred or rejected from HUD:', err);
          });
        }
      } catch (err) {
        console.debug('Pointer lock request failed from HUD:', err);
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 5, 15, 0.4)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          background: 'rgba(15, 15, 30, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '2.5rem 3.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(124, 58, 237, 0.25)',
          animation: 'modal-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
          maxWidth: '90%',
          width: '420px',
        }}
      >
        {/* Animated Mouse Icon */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.6)',
            animation: 'banner-ping 2s infinite alternate',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: '#ffffff' }}
          >
            <rect x="5" y="2" width="14" height="20" rx="7" />
            <path d="M12 6v4" />
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h3 style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-0.02em',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}>
            {promptText}
          </h3>
          <p style={{
            fontSize: '0.85rem',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.6)',
            margin: 0,
          }}>
            {subText}
          </p>
        </div>

        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#8b5cf6',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            padding: '4px 12px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginTop: '0.25rem',
          }}
        >
          {language === 'es' ? 'Presiona ESC para liberar el mouse' : 'Press ESC to unlock cursor'}
        </div>
      </div>
    </div>
  );
}

function CameraSelectionModal() {
  const cameraMode = useGameStore((s) => s.cameraMode);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const setHasSelectedCameraMode = useGameStore((s) => s.setHasSelectedCameraMode);
  const setMobileControlType = useGameStore((s) => s.setMobileControlType);
  const { t } = useTranslation();
  const [selectedMode, setSelectedMode] = useState<'movable' | 'static'>(cameraMode);

  const handleConfirm = () => {
    setCameraMode(selectedMode);
    setMobileControlType(selectedMode === 'static' ? 'wasd' : 'joystick');
    setHasSelectedCameraMode(true);
  };

  return (
    <div className="camera-select-overlay">
      <div className="camera-select-modal">
        <h2 className="camera-select-title">{t('selectCameraTitle')}</h2>
        
        <div className="camera-select-cards">
          <div 
            className={`camera-select-card ${selectedMode === 'movable' ? 'active' : ''}`}
            onClick={() => setSelectedMode('movable')}
          >
            <span className="camera-select-badge">{t('cameraModeRecommended')}</span>
            <div className="camera-select-icon-wrapper">
              <CameraMovableIcon size={28} />
            </div>
            <div className="camera-select-text-group">
              <h3 className="camera-select-card-title">{t('cameraModeMovable')}</h3>
              <p className="camera-select-card-desc">{t('cameraModeMovableDesc')}</p>
            </div>
          </div>

          <div 
            className={`camera-select-card ${selectedMode === 'static' ? 'active' : ''}`}
            onClick={() => setSelectedMode('static')}
          >
            <div className="camera-select-icon-wrapper">
              <CameraStaticIcon size={28} />
            </div>
            <div className="camera-select-text-group">
              <h3 className="camera-select-card-title">{t('cameraModeStatic')}</h3>
              <p className="camera-select-card-desc">{t('cameraModeStaticDesc')}</p>
            </div>
          </div>
        </div>

        <button className="camera-select-confirm-btn" onClick={handleConfirm}>
          {t('cameraModeSelect')}
        </button>
      </div>
    </div>
  );
}

