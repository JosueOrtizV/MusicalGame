import React, { useState, useEffect, useRef } from 'react';
import { useGameStore, selectLocalPlayer } from '@/src/stores/gameStore';
import { getSocket } from '@/src/lib/socketClient';
import { useTranslation } from '@/src/hooks/useTranslation';

interface ChatOverlayProps {
  inGame?: boolean;
}

export function ChatOverlay({ inGame = false }: ChatOverlayProps) {
  const { t } = useTranslation();
  const chatMessages = useGameStore((s) => s.chatMessages);
  const localPlayer = useGameStore(selectLocalPlayer);
  const room = useGameStore((s) => s.room);
  const gameState = useGameStore((s) => s.gameState);
  const [inputText, setInputText] = useState('');
  
  // Safe responsive initial state check: collapsed in-game, dynamic in lobby
  const [isOpen, setIsOpen] = useState(() => {
    if (inGame) return false;
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const [now, setNow] = useState(() => Date.now());
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(chatMessages.length);

  const getSenderColor = (msg: typeof chatMessages[0]) => {
    if (msg.isSystem) return '#f43f5e';
    const gamePlayer = gameState?.players.find(p => p.id === msg.senderId);
    if (gamePlayer) return gamePlayer.color;
    const roomPlayer = room?.players.find(p => p.id === msg.senderId);
    if (roomPlayer) return roomPlayer.color;
    return '#00f0ff';
  };

  const translateSystemMessage = (text: string) => {
    if (text.startsWith('🔵 Round ')) {
      const roundStr = text.replace('🔵 Round ', '').replace(' started!', '');
      const roundNum = parseInt(roundStr, 10);
      return `🔵 ${t('roundNumber', { round: roundNum })} ${t('survive') || 'Survive!'}`;
    }
    if (text.startsWith('☠️ ') && text.endsWith(' fell into the void!')) {
      const name = text.replace('☠️ ', '').replace(' fell into the void!', '');
      return `☠️ ${t('playerFell', { name }) || `${name} fell into the void!`}`;
    }
    if (text.startsWith('🏆 ') && text.endsWith(' won the game!')) {
      const name = text.replace('🏆 ', '').replace(' won the game!', '');
      const translation = t('winnerIs', { name });
      if (translation.startsWith('🏆')) {
        return translation;
      }
      return `🏆 ${translation || `${name} won!`}`;
    }
    if (text.startsWith('🚫 ') && text.endsWith(' has been kicked by the host')) {
      const name = text.replace('🚫 ', '').replace(' has been kicked by the host', '');
      return `🚫 ${t('playerKicked', { name }) || `${name} has been kicked by the host`}`;
    }
    if (text === '💀 Game Over! Everyone died.') {
      return `💀 ${t('gameOver') || 'Game Over!'} ${t('nobodyWon') || 'Everyone died.'}`;
    }
    return text;
  };

  // Timer interval for fading out messages in-game without calling setState synchronously in effect body
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for global chat:minimize event to close chat panel automatically when opening lobby modals
  useEffect(() => {
    const handleMinimize = () => {
      setIsOpen(false);
    };
    window.addEventListener('chat:minimize', handleMinimize);
    return () => {
      window.removeEventListener('chat:minimize', handleMinimize);
    };
  }, []);

  // Handle notification badge for new messages when collapsed
  useEffect(() => {
    if (!isOpen && chatMessages.length > lastMessageCountRef.current) {
      setHasNewMessages(true);
    }
    lastMessageCountRef.current = chatMessages.length;
  }, [chatMessages, isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    getSocket().emit('chat:send', { text: inputText });
    setInputText('');
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewMessages(false);
    }
  };

  // Calculate the floating messages that are younger than 3 seconds (3000ms)
  // On mobile screens (<= 768px), we show only the last 1 message to prevent covering controls.
  // On desktop, we show the last 2 messages.
  const isMobileScreen = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  const floatingMessages = inGame && !isOpen
    ? chatMessages.filter(m => now - (m.localTimestamp || m.timestamp) < 3000).slice(isMobileScreen ? -1 : -2)
    : [];

  const isSpectator = !inGame || (localPlayer && !localPlayer.isAlive);

  return (
    <>
      {/* 1. Floating In-Game HUD overlay (for both alive and spectators when panel is closed) */}
      {inGame && !isOpen && floatingMessages.length > 0 && (
        <div 
          className="chat-overlay" 
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            width: '320px',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            pointerEvents: 'none'
          }}
        >
          {floatingMessages.map((msg) => (
            <div 
              key={msg.id} 
              className="chat-overlay-msg"
              style={{
                background: msg.isSystem ? 'rgba(0, 0, 0, 0.55)' : 'rgba(5, 5, 20, 0.75)',
                borderLeft: msg.isSystem ? '3px solid #f43f5e' : `3px solid ${getSenderColor(msg)}`,
                padding: '6px 12px',
                borderRadius: '0 4px 4px 0',
                color: '#fff',
                fontSize: '0.85rem',
                textShadow: '0 0 4px rgba(0,0,0,0.8)',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                whiteSpace: 'pre-wrap',
                animation: 'fade-in 0.2s ease-out'
              }}
            >
              {!msg.isSystem && <strong style={{ color: getSenderColor(msg) }}>{msg.senderName}: </strong>}
              <span style={{ color: msg.isSystem ? '#f43f5e' : '#fff' }}>
                {msg.isSystem ? translateSystemMessage(msg.text) : msg.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 2. Collapsed Chat Tab (Docked Tab at bottom screen) - only shown in Lobby or to In-game Spectators */}
      {isSpectator && !isOpen && (
        <button 
          onClick={toggleOpen}
          className={inGame ? "chat-tab-btn-ingame" : ""}
          style={{
            position: 'fixed',
            bottom: '0px',
            right: '40px',
            padding: '10px 24px',
            background: 'rgba(5, 5, 20, 0.95)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            borderBottom: 'none',
            borderRadius: '6px 6px 0 0',
            color: '#00f0ff',
            fontFamily: 'var(--font-display)',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 -4px 20px rgba(0, 240, 255, 0.25)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 99999,
            pointerEvents: 'auto',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ff00ff';
            e.currentTarget.style.color = '#ff00ff';
            e.currentTarget.style.boxShadow = '0 -6px 25px rgba(255, 0, 255, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)';
            e.currentTarget.style.color = '#00f0ff';
            e.currentTarget.style.boxShadow = '0 -4px 20px rgba(0, 240, 255, 0.25)';
          }}
        >
          <span>💬 <span className={inGame ? "chat-btn-text-ingame" : ""}>{t('chatPlaceholder')?.replace('...', '') || 'CHAT'}</span></span>
          {hasNewMessages && (
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#f43f5e',
              boxShadow: '0 0 8px #f43f5e',
              display: 'inline-block'
            }} />
          )}
        </button>
      )}

      {/* 3. Expanded Floating Chat Panel - only shown when open (spectators or lobby) */}
      {isSpectator && isOpen && (
        <div 
          className="lobby-chat-container"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '340px',
            height: '420px',
            maxHeight: '75vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(5, 5, 20, 0.85)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            boxShadow: '0 10px 40px rgba(0, 240, 255, 0.15), inset 0 0 20px rgba(0, 240, 255, 0.05)',
            overflow: 'hidden',
            zIndex: 99999,
            pointerEvents: 'auto',
            animation: 'modal-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(0, 20, 40, 0.6)',
            borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ animation: 'pulse 2s infinite' }}>💬</span>
              <span style={{
                color: '#00f0ff',
                fontFamily: 'var(--font-display)',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
                fontSize: '0.9rem',
                textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
              }}>{t('chatPlaceholder')?.replace('...', '') || 'CHAT'}</span>
            </div>
            
            <button 
              onClick={toggleOpen}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '1.2rem',
                cursor: 'pointer',
                transition: 'color 0.2s',
                outline: 'none',
                padding: '0 4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ff00ff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="lobby-chat-messages" style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            {chatMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={`lobby-chat-msg ${msg.isSystem ? 'system-msg' : ''}`}
                style={{
                  margin: '4px 0',
                  padding: '6px 10px',
                  borderRadius: '0 6px 6px 0',
                  background: msg.isSystem ? 'rgba(244, 63, 94, 0.1)' : 'rgba(0, 240, 255, 0.05)',
                  borderLeft: msg.isSystem ? '3px solid #f43f5e' : `3px solid ${getSenderColor(msg)}`,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {!msg.isSystem && <span className="msg-author" style={{ color: getSenderColor(msg), fontWeight: 'bold' }}>{msg.senderName}: </span>}
                <span className="msg-text">
                  {msg.isSystem ? translateSystemMessage(msg.text) : msg.text}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="lobby-chat-input-form" style={{
            display: 'flex',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderTop: '1px solid rgba(0, 240, 255, 0.15)',
            gap: '8px'
          }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('chatPlaceholder') || "Escribe un mensaje..."}
              maxLength={100}
              className="lobby-chat-input"
              style={{
                flex: 1,
                background: 'rgba(0, 10, 20, 0.6)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '4px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00f0ff'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(0, 240, 255, 0.3)'}
            />
            <button 
              type="submit" 
              className="lobby-chat-submit"
              style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '4px',
                color: '#00f0ff',
                padding: '0 12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              📨
            </button>
          </form>
        </div>
      )}
    </>
  );
}
