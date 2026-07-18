import React, { useState, useEffect, useRef } from 'react';
import { useGameStore, selectLocalPlayer } from '@/src/stores/gameStore';
import { getSocket } from '@/src/lib/socketClient';
import { useTranslation } from '@/src/hooks/useTranslation';
import { SkullIcon, CrownIcon, AlertIcon, MusicIcon, ChatBubbleIcon, SendIcon } from '../ui/Icons';
import { hexToRgba } from '@/src/lib/colorUtils';

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

  const getSystemMessageColor = (text: string): string => {
    if (text.startsWith('Round ') && text.endsWith(' started!')) {
      const roundStr = text.replace('Round ', '').replace(' started!', '');
      const roundNum = parseInt(roundStr, 10) || 1;
      if (roundNum <= 2) return '#00f0ff'; // Cian (Fácil)
      if (roundNum <= 4) return '#39ff14'; // Neon Green (Normal)
      if (roundNum <= 6) return '#ffff00'; // Yellow (Hard)
      return '#f43f5e'; // Neon Red/Pink (Extreme/Chaos)
    }
    if (text.endsWith(' fell into the void!')) {
      const name = text.replace(' fell into the void!', '');
      const pColor = gameState?.players.find(p => p.name === name)?.color || room?.players.find(p => p.name === name)?.color;
      return pColor || '#ef4444'; // Red/custom
    }
    if (text.endsWith(' won the game!')) {
      const name = text.replace(' won the game!', '');
      const pColor = gameState?.players.find(p => p.name === name)?.color || room?.players.find(p => p.name === name)?.color;
      return pColor || '#eab308'; // Gold/custom
    }
    if (text.endsWith(' has been kicked by the host')) {
      const name = text.replace(' has been kicked by the host', '');
      const pColor = gameState?.players.find(p => p.name === name)?.color || room?.players.find(p => p.name === name)?.color;
      return pColor || '#f59e0b'; // Amber warning/custom
    }
    if (text.endsWith(' has been kicked for inactivity')) {
      const name = text.replace(' has been kicked for inactivity', '');
      const pColor = gameState?.players.find(p => p.name === name)?.color || room?.players.find(p => p.name === name)?.color;
      return pColor || '#f59e0b'; // Amber warning/custom
    }
    if (text === 'Game Over! Everyone died.') {
      return '#ef4444'; // Red
    }

    // Emoji-based fallbacks (parsing server messages directly)
    if (cleanEmojiContains(text, '🏆')) {
      const p = findNameInText(text);
      return p?.color || '#eab308';
    }
    if (cleanEmojiContains(text, '☠️') || cleanEmojiContains(text, '💀')) {
      const p = findNameInText(text);
      return p?.color || '#ef4444';
    }

    return '#f43f5e'; // default rose system color
  };

  const findNameInText = (text: string) => {
    const list = [...(gameState?.players || []), ...(room?.players || [])];
    return list.find(p => text.toLowerCase().includes(p.name.toLowerCase()));
  };

  const cleanEmojiContains = (text: string, emoji: string) => {
    return text.includes(emoji);
  };

  const translateSystemMessage = (text: string): React.ReactNode => {
    // 1. Round Start: "Round {round} started!"
    if (text.startsWith('Round ') && text.endsWith(' started!')) {
      const roundStr = text.replace('Round ', '').replace(' started!', '');
      const roundNum = parseInt(roundStr, 10);
      const color = getSystemMessageColor(text);
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle', color }}>
          <MusicIcon size={12} style={{ color }} />
          <span>{t('roundNumber', { round: roundNum })} {t('survive') || 'Survive!'}</span>
        </span>
      );
    }
    // 2. Player Fell: "{name} fell into the void!"
    if (text.endsWith(' fell into the void!')) {
      const name = text.replace(' fell into the void!', '');
      const color = getSystemMessageColor(text);
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle', color }}>
          <SkullIcon size={12} style={{ color }} />
          <span>{t('playerFell', { name }) || `${name} fell into the void!`}</span>
        </span>
      );
    }
    // 3. Player Won: "{name} won the game!"
    if (text.endsWith(' won the game!')) {
      const name = text.replace(' won the game!', '');
      const color = getSystemMessageColor(text);
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle', color }}>
          <CrownIcon size={12} style={{ color }} />
          <strong style={{ textShadow: `0 0 8px ${hexToRgba(color, 0.45)}` }}>
            {t('winnerIs', { name }) || `${name} won the game!`}
          </strong>
        </span>
      );
    }
    // 4. Kicked: "{name} has been kicked by the host"
    if (text.endsWith(' has been kicked by the host')) {
      const name = text.replace(' has been kicked by the host', '');
      const color = getSystemMessageColor(text);
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle', color }}>
          <AlertIcon size={12} style={{ color }} />
          <span>{t('playerKicked', { name }) || `${name} has been kicked by the host`}</span>
        </span>
      );
    }
    // 4b. Kicked AFK: "{name} has been kicked for inactivity"
    if (text.endsWith(' has been kicked for inactivity')) {
      const name = text.replace(' has been kicked for inactivity', '');
      const color = getSystemMessageColor(text);
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle', color }}>
          <AlertIcon size={12} style={{ color }} />
          <span>{t('playerKickedAfk', { name }) || `${name} has been kicked for inactivity`}</span>
        </span>
      );
    }
    // 5. Game Over: "Game Over! Everyone died."
    if (text === 'Game Over! Everyone died.') {
      const color = getSystemMessageColor(text);
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle', color }}>
          <SkullIcon size={12} style={{ color }} />
          <span>{t('gameOver') || 'Game Over!'} {t('nobodyWon') || 'Everyone died.'}</span>
        </span>
      );
    }

    // In case there is still a message with emoji from server, parse it gracefully or just return it
    let cleanText = text;
    let icon: React.ReactNode = null;
    const color = getSystemMessageColor(text);

    if (cleanText.includes('🔵')) {
      cleanText = cleanText.replace('🔵', '').trim();
      icon = <MusicIcon size={12} style={{ color }} />;
    } else if (cleanText.includes('☠️')) {
      cleanText = cleanText.replace('☠️', '').trim();
      icon = <SkullIcon size={12} style={{ color }} />;
    } else if (cleanText.includes('🏆')) {
      cleanText = cleanText.replace('🏆', '').trim();
      icon = <CrownIcon size={12} style={{ color }} />;
    } else if (cleanText.includes('💀')) {
      cleanText = cleanText.replace('💀', '').trim();
      icon = <SkullIcon size={12} style={{ color }} />;
    } else if (cleanText.includes('🚫')) {
      cleanText = cleanText.replace('🚫', '').trim();
      icon = <AlertIcon size={12} style={{ color }} />;
    }

    if (icon) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle', color }}>
          {icon}
          <span>{cleanText}</span>
        </span>
      );
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

  const gameMode = useGameStore((s) => s.gameMode);
  
  // Calculate the floating messages that are younger than 3 seconds (3000ms)
  // On mobile screens (<= 768px), we show only the last 1 message to prevent covering controls.
  // On desktop, we show the last 2 messages.
  const isMobileScreen = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  const floatingMessages = inGame && !isOpen
    ? chatMessages.filter(m => now - (m.localTimestamp || m.timestamp) < 3000).slice(isMobileScreen ? -1 : -2)
    : [];

  const isSpectator = gameMode !== 'singleplayer' && (!inGame || (localPlayer && !localPlayer.isAlive));

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
                borderLeft: msg.isSystem ? `3px solid ${getSystemMessageColor(msg.text)}` : `3px solid ${getSenderColor(msg)}`,
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
              <span style={{ color: msg.isSystem ? getSystemMessageColor(msg.text) : '#fff' }}>
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
          className={inGame ? "chat-tab-btn-ingame" : "chat-tab-btn-lobby"}
          style={{
            position: 'fixed',
            bottom: '0px',
            right: '40px',
            padding: '10px 24px',
            background: 'rgba(15, 15, 35, 0.95)',
            border: '1px solid var(--c-border)',
            borderBottom: 'none',
            borderRadius: 'var(--radius) var(--radius) 0 0',
            color: 'var(--c-accent-3)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 -4px 20px rgba(124, 58, 237, 0.25)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 99999,
            pointerEvents: 'auto',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--c-accent-2)';
            e.currentTarget.style.color = 'var(--c-accent-2)';
            e.currentTarget.style.boxShadow = '0 -6px 25px rgba(244, 63, 94, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--c-border)';
            e.currentTarget.style.color = 'var(--c-accent-3)';
            e.currentTarget.style.boxShadow = '0 -4px 20px rgba(124, 58, 237, 0.25)';
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChatBubbleIcon size={16} /> 
            <span className={inGame ? "chat-btn-text-ingame" : ""}>CHAT</span>
          </span>
          {hasNewMessages && (
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--c-accent-2)',
              boxShadow: 'var(--glow-rose)',
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
            background: 'rgba(15, 15, 35, 0.9)',
            backdropFilter: 'blur(12px)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--c-border)',
            boxShadow: 'var(--shadow), var(--glow-purple)',
            overflow: 'hidden',
            zIndex: 99999,
            pointerEvents: 'auto',
            animation: 'modal-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* HUD Corner Brackets & Scanlines for the authentic terminal style */}
          <span className="hud-corner top-left"></span>
          <span className="hud-corner top-right"></span>
          <span className="hud-corner bottom-left"></span>
          <span className="hud-corner bottom-right"></span>
          <div className="hud-scanlines"></div>

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(20, 20, 47, 0.75)',
            borderBottom: '1px solid var(--c-border)',
            zIndex: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ animation: 'pulse 2s infinite', display: 'flex' }}>
                <ChatBubbleIcon size={16} style={{ color: 'var(--c-accent-3)' }} />
              </span>
              <span style={{
                color: 'var(--c-accent-3)',
                fontFamily: 'var(--font-display)',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
                fontSize: '0.75rem',
                textShadow: '0 0 10px var(--c-accent)'
              }}>CHAT</span>
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
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--c-accent-2)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="lobby-chat-messages" style={{ flex: 1, padding: '12px', overflowY: 'auto', zIndex: 6 }}>
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`lobby-chat-msg ${msg.isSystem ? 'system-msg' : ''}`}
                style={{
                  margin: '4px 0',
                  padding: '6px 10px',
                  borderRadius: '0 var(--radius) var(--radius) 0',
                  background: msg.isSystem ? hexToRgba(getSystemMessageColor(msg.text), 0.1) : 'rgba(124, 58, 237, 0.05)',
                  borderLeft: msg.isSystem ? `3px solid ${getSystemMessageColor(msg.text)}` : `3px solid ${getSenderColor(msg)}`,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {!msg.isSystem && <span className="msg-author" style={{ color: getSenderColor(msg), fontWeight: 'bold' }}>{msg.senderName}: </span>}
                <span className="msg-text" style={{ color: msg.isSystem ? getSystemMessageColor(msg.text) : '#fff' }}>
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
            background: 'rgba(10, 10, 26, 0.95)',
            borderTop: '1px solid var(--c-border)',
            gap: '8px',
            zIndex: 6
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
                background: 'rgba(5, 5, 20, 0.65)',
                border: '1px solid var(--c-border)',
                borderRadius: 'var(--radius)',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--c-accent-2)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--c-border)'}
            />
            <button
              type="submit"
              className="lobby-chat-submit"
              style={{
                background: 'rgba(124, 58, 237, 0.1)',
                border: '1px solid var(--c-border)',
                borderRadius: 'var(--radius)',
                color: 'var(--c-accent-3)',
                padding: '0 12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <SendIcon size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
