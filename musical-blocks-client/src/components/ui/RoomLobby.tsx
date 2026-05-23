import { useRef, useEffect, useState } from 'react';
import { useGameStore, selectIsHost } from '@/src/stores/gameStore';
import { getSocket } from '@/src/lib/socketClient';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useToastStore } from '@/src/stores/toastStore';
import { ChatOverlay } from '@/src/components/hud/ChatOverlay';

// ---------------------------------------------------------------------------
//  RoomLobby — waiting room after joining / creating a room
// ---------------------------------------------------------------------------
export function RoomLobby() {
  const room = useGameStore((s) => s.room);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const isHost = useGameStore(selectIsHost);
  const store = useGameStore();
  const { t, lang } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const prevPlayersRef = useRef(room?.players ?? []);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'difficulty' | 'speed' | 'lives' | 'modifiers'>('difficulty');
  const [isSdExpanded, setIsSdExpanded] = useState(false);

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
    if (typeof window !== 'undefined') {
      const inviteUrl = `${window.location.origin}/?room=${room.id.toUpperCase()}`;
      navigator.clipboard.writeText(inviteUrl);
      addToast(t('copiedLink'), 'success');
    }
  };

  const getDifficultyName = (colors: number) => {
    if (colors === 4) return lang === 'es' ? 'Fácil' : 'Easy';
    if (colors === 6) return lang === 'es' ? 'Normal' : 'Normal';
    if (colors === 8) return lang === 'es' ? 'Difícil' : 'Hard';
    return lang === 'es' ? 'Extremo' : 'Extreme';
  };


  return (
    <div className="room-lobby-bg">
      <div className="room-lobby-card">
        {/* Host Settings Trigger Button */}
        {isHost && (
          <button
            className="lobby-settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            title={t('roomSettingsTitle')}
          >
            🕹️
          </button>
        )}

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

          {/* Real-time Game Difficulty Status Badge */}
          <div className="lobby-difficulty-status">
            <span
              className="difficulty-indicator-dot"
              style={{
                backgroundColor: (room.settings?.maxColors === 4) ? '#22c55e' :
                                 (room.settings?.maxColors === 6) ? '#3b82f6' :
                                 (room.settings?.maxColors === 8) ? '#eab308' :
                                 '#ef4444',
                color: (room.settings?.maxColors === 4) ? '#22c55e' :
                       (room.settings?.maxColors === 6) ? '#3b82f6' :
                       (room.settings?.maxColors === 8) ? '#eab308' :
                       '#ef4444'
              }}
            />
            <span className="difficulty-indicator-text">
              
              <strong
                style={{
                  color: (room.settings?.maxColors === 4) ? '#22c55e' :
                         (room.settings?.maxColors === 6) ? '#3b82f6' :
                         (room.settings?.maxColors === 8) ? '#eab308' :
                         '#ef4444',
                  textShadow: (room.settings?.maxColors === 4) ? '0 0 10px rgba(34, 197, 94, 0.3)' :
                              (room.settings?.maxColors === 6) ? '0 0 10px rgba(59, 130, 246, 0.3)' :
                              (room.settings?.maxColors === 8) ? '0 0 10px rgba(234, 179, 8, 0.3)' :
                              '0 0 10px rgba(239, 68, 68, 0.3)'
                }}
              >
                {getDifficultyName(room.settings?.maxColors ?? 6)} ({room.settings?.maxColors ?? 6} {lang === 'es' ? 'Colores' : 'Colors'})
              </strong>
              <span style={{ margin: '0 8px', color: 'var(--c-muted)', opacity: 0.5 }}>•</span>
              <strong
                style={{
                  color: (room.settings?.gameSpeed === 'CHILL') ? '#38bdf8' :
                         (room.settings?.gameSpeed === 'TURBO') ? '#eab308' :
                         '#3b82f6',
                  textShadow: (room.settings?.gameSpeed === 'CHILL') ? '0 0 10px rgba(56, 189, 248, 0.3)' :
                              (room.settings?.gameSpeed === 'TURBO') ? '0 0 10px rgba(234, 179, 8, 0.3)' :
                              '0 0 10px rgba(59, 130, 246, 0.3)'
                }}
              >
                {(room.settings?.gameSpeed === 'CHILL') ? '❄️ ' + t('speedChill') :
                 (room.settings?.gameSpeed === 'TURBO') ? '⚡ ' + t('speedTurbo') :
                 '⏱️ ' + t('speedNormal')}
              </strong>
              {room.settings?.maxLives !== undefined && (
                <>
                  <span style={{ margin: '0 8px', color: 'var(--c-muted)', opacity: 0.5 }}>•</span>
                  <strong style={{ color: '#f43f5e', textShadow: '0 0 10px rgba(244, 63, 94, 0.4)' }}>
                    ❤️ {room.settings.maxLives} {room.settings.maxLives === 1 ? (lang === 'es' ? 'Vida' : 'Life') : (lang === 'es' ? 'Vidas' : 'Lives')}
                  </strong>
                </>
              )}
              {room.settings?.isBlindMode && (
                <>
                  <span style={{ margin: '0 8px', color: 'var(--c-muted)', opacity: 0.5 }}>•</span>
                  <strong
                    style={{
                      color: '#d946ef',
                      textShadow: '0 0 10px rgba(217, 70, 239, 0.4)'
                    }}
                  >
                    🕶️ {t('blindModeLabel')}
                  </strong>
                </>
              )}
              {room.settings?.enableCollisions && (
                <>
                  <span style={{ margin: '0 8px', color: 'var(--c-muted)', opacity: 0.5 }}>•</span>
                  <strong
                    style={{
                      color: '#00f0ff',
                      textShadow: '0 0 10px rgba(0, 240, 255, 0.4)'
                    }}
                  >
                    👥 {t('collisionsLabel')}
                  </strong>
                </>
              )}
              {room.settings?.suddenDeathMode && room.settings.suddenDeathMode !== 'NORMAL' && (
                <>
                  <span style={{ margin: '0 8px', color: 'var(--c-muted)', opacity: 0.5 }}>•</span>
                  <strong
                    style={{
                      color: room.settings.suddenDeathMode === 'CHAOS' ? '#f43f5e' : '#10b981',
                      textShadow: room.settings.suddenDeathMode === 'CHAOS' ? '0 0 10px rgba(244, 63, 94, 0.4)' : '0 0 10px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    {room.settings.suddenDeathMode === 'CHAOS' ? '💀 ' + t('sdChaos') : '🕊️ ' + t('sdOff')}
                  </strong>
                </>
              )}
            </span>
          </div>
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

      {/* Global Floating Chat Widget */}
      <ChatOverlay inGame={false} />

      {/* Modern Glassmorphic Settings Modal */}
      {isSettingsOpen && (
        <div className="settings-modal-overlay">
          <div className="settings-modal-card">
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">{t('roomSettingsTitle')}</h3>
              <button
                className="settings-modal-close"
                onClick={() => setIsSettingsOpen(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="settings-modal-body settings-modal-body--with-sidebar">
              {/* Sidebar Navigation */}
              <div className="settings-sidebar">
                <button
                  className={`settings-tab-btn ${activeTab === 'difficulty' ? 'active' : ''}`}
                  onClick={() => setActiveTab('difficulty')}
                >
                  <span className="tab-icon">🎨</span>
                  <span className="tab-label">{t('tabColors')}</span>
                </button>
                <button
                  className={`settings-tab-btn ${activeTab === 'speed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('speed')}
                >
                  <span className="tab-icon">⏱️</span>
                  <span className="tab-label">{t('tabSpeed')}</span>
                </button>
                <button
                  className={`settings-tab-btn ${activeTab === 'lives' ? 'active' : ''}`}
                  onClick={() => setActiveTab('lives')}
                >
                  <span className="tab-icon">❤️</span>
                  <span className="tab-label">{t('tabLives')}</span>
                </button>
                <button
                  className={`settings-tab-btn ${activeTab === 'modifiers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('modifiers')}
                >
                  <span className="tab-icon">💀</span>
                  <span className="tab-label">{t('tabModifiers')}</span>
                </button>
              </div>

              {/* Main Content Area */}
              <div className="settings-content-area" style={{ maxHeight: '380px', overflowY: 'auto', minHeight: 0, paddingRight: '8px' }}>
                {activeTab === 'difficulty' && (
                  <div className="settings-tab-content fade-in">
                    <h4 className="settings-modal-subtitle">{t('activeColorsLabel')}</h4>
                    <p className="settings-modal-intro">{t('activeColorsDesc')}</p>
                    
                    <div className="difficulty-tiers-list">
                      {/* Easy Tier Card */}
                      <button
                        className={`difficulty-tier-btn tier--easy ${(room.settings?.maxColors ?? 6) === 4 ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, maxColors: 4 }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">🟢</span>
                          <span className="tier-name">{t('easyLabel')}</span>
                        </div>
                        <p className="tier-desc">{t('easyDesc')}</p>
                      </button>

                      {/* Normal Tier Card */}
                      <button
                        className={`difficulty-tier-btn tier--normal ${(room.settings?.maxColors ?? 6) === 6 ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, maxColors: 6 }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">🔵</span>
                          <span className="tier-name">{t('normalLabel')}</span>
                        </div>
                        <p className="tier-desc">{t('normalDesc')}</p>
                      </button>

                      {/* Hard Tier Card */}
                      <button
                        className={`difficulty-tier-btn tier--hard ${(room.settings?.maxColors ?? 6) === 8 ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, maxColors: 8 }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">🟡</span>
                          <span className="tier-name">{t('hardLabel')}</span>
                        </div>
                        <p className="tier-desc">{t('hardDesc')}</p>
                      </button>

                      {/* Extreme Tier Card */}
                      <button
                        className={`difficulty-tier-btn tier--extreme ${(room.settings?.maxColors ?? 6) === 10 ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, maxColors: 10 }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">🔴</span>
                          <span className="tier-name">{t('extremeLabel')}</span>
                        </div>
                        <p className="tier-desc">{t('extremeDesc')}</p>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'speed' && (
                  <div className="settings-tab-content fade-in">
                    <h4 className="settings-modal-subtitle">{t('speedLabel')}</h4>
                    <p className="settings-modal-intro">{t('speedDesc')}</p>
                    
                    <div className="difficulty-tiers-list">
                      {/* Chill Speed */}
                      <button
                        className={`difficulty-tier-btn tier--chill ${(room.settings?.gameSpeed === 'CHILL') ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, gameSpeed: 'CHILL' }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">❄️</span>
                          <span className="tier-name">{t('speedChill')}</span>
                        </div>
                        <p className="tier-desc">{t('speedChillDesc')}</p>
                      </button>

                      {/* Normal Speed */}
                      <button
                        className={`difficulty-tier-btn tier--normal ${(room.settings?.gameSpeed === 'NORMAL' || !room.settings?.gameSpeed) ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, gameSpeed: 'NORMAL' }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">⏱️</span>
                          <span className="tier-name">{t('speedNormal')}</span>
                        </div>
                        <p className="tier-desc">{t('speedNormalDesc')}</p>
                      </button>

                      {/* Turbo Speed */}
                      <button
                        className={`difficulty-tier-btn tier--turbo ${(room.settings?.gameSpeed === 'TURBO') ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, gameSpeed: 'TURBO' }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">⚡</span>
                          <span className="tier-name">{t('speedTurbo')}</span>
                        </div>
                        <p className="tier-desc">{t('speedTurboDesc')}</p>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'lives' && (
                  <div className="settings-tab-content fade-in">
                    <h4 className="settings-modal-subtitle">{t('livesTitle')}</h4>
                    <p className="settings-modal-intro">{t('livesDesc')}</p>
                    
                    <div className="difficulty-tiers-list">
                      <button
                        className={`difficulty-tier-btn tier--hard ${(room.settings?.maxLives === 1) ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, maxLives: 1 }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">☠️</span>
                          <span className="tier-name">{t('lives1')}</span>
                        </div>
                        <p className="tier-desc">{t('lives1Desc')}</p>
                      </button>

                      <button
                        className={`difficulty-tier-btn tier--normal ${(room.settings?.maxLives === 3 || !room.settings?.maxLives) ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, maxLives: 3 }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">❤️</span>
                          <span className="tier-name">{t('lives3')}</span>
                        </div>
                        <p className="tier-desc">{t('lives3Desc')}</p>
                      </button>

                      <button
                        className={`difficulty-tier-btn tier--easy ${(room.settings?.maxLives === 5) ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, maxLives: 5 }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">💖</span>
                          <span className="tier-name">{t('lives5')}</span>
                        </div>
                        <p className="tier-desc">{t('lives5Desc')}</p>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'modifiers' && (
                  <div className="settings-tab-content fade-in" style={{ paddingBottom: '24px' }}>
                    <h4 className="settings-modal-subtitle">{t('tabModifiers')}</h4>
                    <p className="settings-modal-description">
                      {t('modifiersDesc')}
                    </p>
                    
                    <div className="difficulty-tiers-list">
                      <button
                        className={`difficulty-tier-btn tier--extreme ${room.settings?.isBlindMode ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, isBlindMode: !room.settings?.isBlindMode }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">🕶️</span>
                          <span className="tier-name">{t('blindModeLabel')}</span>
                        </div>
                        <p className="tier-desc">{t('blindModeDesc')}</p>
                      </button>

                      {/* Player Collisions Toggle Modifier */}
                      <button
                        className={`difficulty-tier-btn tier--normal ${room.settings?.enableCollisions ? 'active' : ''}`}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, enableCollisions: !room.settings?.enableCollisions }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">👥</span>
                          <span className="tier-name">{t('collisionsLabel')}</span>
                        </div>
                        <p className="tier-desc">
                          {room.settings?.enableCollisions ? t('collisionsEnabledDesc') : t('collisionsDisabledDesc')}
                        </p>
                      </button>
                    </div>

                    {/* Collapsible Sudden Death Trigger Header */}
                    <button
                      className="difficulty-tier-btn"
                      style={{
                        width: '100%',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 18px',
                        background: 'rgba(0, 240, 255, 0.03)',
                        border: '1px solid rgba(0, 240, 255, 0.2)',
                        boxShadow: '0 0 10px rgba(0, 240, 255, 0.05)',
                        marginTop: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                      onClick={() => setIsSdExpanded(!isSdExpanded)}
                    >
                      <div className="tier-header" style={{ margin: 0, gap: '10px' }}>
                        <span className="tier-icon" style={{ fontSize: '1.2rem' }}>
                          {room.settings?.suddenDeathMode === 'CHAOS' ? '💀' : 
                           room.settings?.suddenDeathMode === 'OFF' ? '🕊️' : '⏱️'}
                        </span>
                        <span className="tier-name" style={{ fontSize: '0.9rem', color: 'var(--c-accent)' }}>
                          {t('suddenDeathLabel')}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Status Badge */}
                        <strong
                          style={{
                            fontSize: '0.78rem',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: room.settings?.suddenDeathMode === 'CHAOS' ? 'rgba(244, 63, 94, 0.15)' : 
                                        room.settings?.suddenDeathMode === 'OFF' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: room.settings?.suddenDeathMode === 'CHAOS' ? '#f43f5e' : 
                                   room.settings?.suddenDeathMode === 'OFF' ? '#10b981' : '#3b82f6',
                            border: `1px solid ${
                              room.settings?.suddenDeathMode === 'CHAOS' ? 'rgba(244, 63, 94, 0.3)' : 
                              room.settings?.suddenDeathMode === 'OFF' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'
                            }`,
                            textShadow: `0 0 8px ${
                              room.settings?.suddenDeathMode === 'CHAOS' ? 'rgba(244, 63, 94, 0.3)' : 
                              room.settings?.suddenDeathMode === 'OFF' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'
                            }`
                          }}
                        >
                          {room.settings?.suddenDeathMode === 'CHAOS' ? t('sdChaos') : 
                           room.settings?.suddenDeathMode === 'OFF' ? t('sdOff') : t('sdNormal')}
                        </strong>
                        
                        {/* Collapse Arrow */}
                        <span style={{ 
                          fontSize: '0.9rem', 
                          color: 'var(--c-muted)',
                          transform: isSdExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}>
                          ▼
                        </span>
                      </div>
                    </button>

                    {/* Collapsible Content Area */}
                    <div style={{
                      maxHeight: isSdExpanded ? '500px' : '0px',
                      overflow: 'hidden',
                      opacity: isSdExpanded ? 1 : 0,
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      paddingTop: isSdExpanded ? '12px' : '0px',
                      paddingLeft: '4px',
                      paddingRight: '4px',
                    }}>
                      <p className="settings-modal-description" style={{ margin: '0 0 4px 0' }}>
                        {t('suddenDeathDesc')}
                      </p>
                      
                      <button
                        className={`difficulty-tier-btn tier--easy ${(room.settings?.suddenDeathMode === 'OFF') ? 'active' : ''}`}
                        style={{ width: '100%', textAlign: 'left' }}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, suddenDeathMode: 'OFF' }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">🕊️</span>
                          <span className="tier-name">{t('sdOff')}</span>
                        </div>
                        <p className="tier-desc">{t('sdOffDesc')}</p>
                      </button>

                      <button
                        className={`difficulty-tier-btn tier--normal ${(room.settings?.suddenDeathMode === 'NORMAL' || !room.settings?.suddenDeathMode) ? 'active' : ''}`}
                        style={{ width: '100%', textAlign: 'left' }}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, suddenDeathMode: 'NORMAL' }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">⏱️</span>
                          <span className="tier-name">{t('sdNormal')}</span>
                        </div>
                        <p className="tier-desc">{t('sdNormalDesc')}</p>
                      </button>

                      <button
                        className={`difficulty-tier-btn tier--hard ${(room.settings?.suddenDeathMode === 'CHAOS') ? 'active' : ''}`}
                        style={{ width: '100%', textAlign: 'left' }}
                        onClick={() => {
                          getSocket().emit('host:update_settings', {
                            settings: { ...room.settings, suddenDeathMode: 'CHAOS' }
                          });
                        }}
                      >
                        <div className="tier-header">
                          <span className="tier-icon">💀</span>
                          <span className="tier-name">{t('sdChaos')}</span>
                        </div>
                        <p className="tier-desc">{t('sdChaosDesc')}</p>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="settings-modal-footer">
              <button
                className="settings-modal-save-btn"
                onClick={() => setIsSettingsOpen(false)}
              >
                {t('closeBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
