'use client';

import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/src/stores/gameStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { getSocket } from '@/src/lib/socketClient';
import { GearIcon, VolumeUpIcon, VolumeMuteIcon, GlobeIcon } from './Icons';

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const language = useGameStore((s) => s.language);
  const volume = useGameStore((s) => s.volume);
  const isMuted = useGameStore((s) => s.isMuted);
  const setLanguage = useGameStore((s) => s.setLanguage);
  const setVolume = useGameStore((s) => s.setVolume);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const screen = useGameStore((s) => s.screen);
  const clearRoom = useGameStore((s) => s.clearRoom);
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Handle ESC key to open/close menu when in game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

