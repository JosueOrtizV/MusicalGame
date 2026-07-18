'use client';

import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/src/stores/gameStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { getSocket } from '@/src/lib/socketClient';
import { GearIcon, VolumeUpIcon, VolumeMuteIcon, GlobeIcon, CameraMovableIcon, CameraStaticIcon, FullscreenIcon } from './Icons';

// Custom interface to avoid 'any' types for browser-specific fullscreen APIs
interface DocumentWithFullscreen extends Document {
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  mozFullScreenEnabled?: boolean;
  msFullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
}

interface HTMLElementWithFullscreen extends HTMLElement {
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
}

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const language = useGameStore((s) => s.language);
  const volume = useGameStore((s) => s.volume);
  const isMuted = useGameStore((s) => s.isMuted);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const mobileControlType = useGameStore((s) => s.mobileControlType);
  const setLanguage = useGameStore((s) => s.setLanguage);
  const setVolume = useGameStore((s) => s.setVolume);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const setMobileControlType = useGameStore((s) => s.setMobileControlType);
  const screen = useGameStore((s) => s.screen);
  const clearRoom = useGameStore((s) => s.clearRoom);
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isFullscreenSupported, setIsFullscreenSupported] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if fullscreen is actually supported (iOS Safari iPhone doesn't support it)
  useEffect(() => {
    const doc = document as DocumentWithFullscreen;
    const supported = 
      doc.fullscreenEnabled || 
      doc.webkitFullscreenEnabled || 
      doc.mozFullScreenEnabled || 
      doc.msFullscreenEnabled;
      
    // If it's installed as a PWA, it's already full screen
    const nav = window.navigator as unknown as { standalone?: boolean };
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || nav.standalone;

    // Additionally check if it's iOS (iPad/iPhone) because iPhone Safari claims webkitFullscreenEnabled=false for normal elements
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);

    if (!supported || isStandalone || isIOS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFullscreenSupported(false);
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleFullscreen = () => {
    const docEl = document.documentElement as HTMLElementWithFullscreen;
    const doc = document as DocumentWithFullscreen;
    const requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    const exitFs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
    
    const currentFs = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

    if (!currentFs) {
      if (requestFs) {
        try {
          const promise = requestFs.call(docEl);
          if (promise) {
            promise.then(() => setIsFullscreen(true)).catch((err: Error) => {
              console.warn(`Error attempting to enable fullscreen: ${err.message}`);
            });
          } else {
            setIsFullscreen(true); // for older browsers that don't return a promise
          }
        } catch (e) {
          console.warn('Fullscreen request failed', e);
        }
      }
    } else {
      if (exitFs) {
        try {
          const promise = exitFs.call(document);
          if (promise) {
            promise.then(() => setIsFullscreen(false));
          } else {
            setIsFullscreen(false);
          }
        } catch (e) {}
      }
    }
  };

  // Handle F11 for Fullscreen and ESC key to open/close menu when in game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      if (e.key === 'Escape' && screen !== 'home') {
        // If there's an active lobby settings or avatar locker modal open, ignore Escape and yield control to the modal
        const hasOpenModal = document.querySelector('.settings-modal-overlay') || 
                             document.querySelector('.locker-modal-overlay');
        if (hasOpenModal) return;
        
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen]);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  const handleLeaveGame = () => {
    clearRoom();
    getSocket().emit('room:leave');
    setIsOpen(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="settings-menu-container" ref={menuRef}>
      <button 
        className="settings-menu-btn" 
        onClick={() => setIsOpen(!isOpen)}
        title={t('settings')}
        aria-label={t('settings')}
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <GearIcon size={18} />
      </button>

      {/* Fullscreen Button */}
      {isFullscreenSupported && (
        <button 
          className="settings-menu-btn" 
          onClick={toggleFullscreen}
          title={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
          aria-label={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <FullscreenIcon size={18} />
        </button>
      )}

      {/* Portal target for page-specific buttons (like Leaderboard) to inherit flex layout */}
      <div id="settings-menu-extra-actions" style={{ display: 'flex', gap: '8px' }}></div>

      {isOpen && (
        <div className="settings-dropdown" role="dialog" aria-label={t('settings')}>
          <div className="settings-option">
            <span className="settings-label">
              {t('language')}
            </span>
            <button 
              className="settings-toggle" 
              onClick={toggleLanguage} 
              aria-label={language === 'es' ? 'Cambiar idioma a Inglés' : 'Change language to Spanish'}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <GlobeIcon size={12} />
              <span>{language === 'es' ? 'ESP' : 'ENG'}</span>
            </button>
          </div>

          <div className="settings-option">
            <span className="settings-label">
              {t('cameraMode')}
            </span>
            <button 
              className="settings-toggle" 
              onClick={() => setCameraMode(cameraMode === 'movable' ? 'static' : 'movable')} 
              aria-label={cameraMode === 'movable' ? 'Cambiar a cámara estática' : 'Cambiar a cámara libre'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {cameraMode === 'movable' ? <CameraMovableIcon size={14} /> : <CameraStaticIcon size={14} />}
              <span>{cameraMode === 'movable' ? t('cameraModeMovable') : t('cameraModeStatic')}</span>
            </button>
          </div>

          {isMobile && (
            <div className="settings-option">
              <span className="settings-label">
                {t('mobileControls')}
              </span>
              <button 
                className="settings-toggle" 
                onClick={() => setMobileControlType(mobileControlType === 'joystick' ? 'wasd' : 'joystick')}
                aria-label="Toggle mobile controls"
              >
                <span>{mobileControlType === 'joystick' ? t('joystick') : t('wasdButtons')}</span>
              </button>
            </div>
          )}

          <div className="settings-option">
            <span className="settings-label">
              {t('volume')}
            </span>
            <div className="settings-volume-group">
              <button 
                className={`settings-mute-btn ${isMuted ? 'muted' : ''}`}
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                aria-pressed={isMuted}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isMuted ? <VolumeMuteIcon size={16} /> : <VolumeUpIcon size={16} />}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="settings-slider"
                aria-label={t('volume')}
              />
              <span className="settings-value">{Math.round(volume * 100)}%</span>
            </div>
          </div>

          {screen !== 'home' && (
            <>
              <div style={{ height: '1px', backgroundColor: 'rgba(124, 58, 237, 0.15)', margin: '0.5rem 0' }} />
              <button 
                onClick={handleLeaveGame}
                style={{ 
                  width: '100%', 
                  padding: '0.6rem', 
                  backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 'var(--radius)',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-retro)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginTop: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.35)';
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {t('leaveRoom')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

