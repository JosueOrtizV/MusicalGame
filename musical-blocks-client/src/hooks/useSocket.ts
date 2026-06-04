'use client';

import { useEffect, useRef } from 'react';
import { getSocket, setClockOffset } from '@/src/lib/socketClient';
import { useGameStore } from '@/src/stores/gameStore';
import { useToastStore } from '@/src/stores/toastStore';
import { useTranslation } from './useTranslation';

import { en } from '@/src/locales/en';
import { es } from '@/src/locales/es';

// ---------------------------------------------------------------------------
//  useSocket — connects to server, wires all ServerEvents → Zustand store
// ---------------------------------------------------------------------------
export function useSocket() {
  const store = useGameStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const socket = getSocket();

    // ---- Connection events -------------------------------------------------
    socket.on('connect', () => {
      const wasInRoom = !!useGameStore.getState().room;
      
      store.setConnected(true);
      store.setLocalPlayer(socket.id!, store.localPlayerName);
      store.setConnectionError(null);

      if (wasInRoom) {
        // Session lost on reconnect (socket ID changed)
        store.clearRoom();
        const currentLang = useGameStore.getState().language;
        const errStr = currentLang === 'es' ? es.errSessionLost : en.errSessionLost;
        store.setConnectionError(errStr);
      } else {
        // Start clock sync only if not just kicked
        const t0 = Date.now();
        socket.emit('ping', { clientTime: t0 });
      }
    });

    socket.on('disconnect', () => {
      store.setConnected(false);
    });

    socket.on('connect_error', (err) => {
      const errMsg = err.message || 'Cannot connect to server. Is it running?';
      store.setConnectionError(errMsg);
      useToastStore.getState().addToast(errMsg, 'error');
    });

    // ---- Clock sync --------------------------------------------------------
    socket.on('pong', ({ serverTime, clientTime }) => {
      const rtt = Date.now() - clientTime;
      setClockOffset(serverTime - (clientTime + rtt / 2));
    });

    // ---- Room events -------------------------------------------------------
    socket.on('room:updated', ({ room }) => {
      useGameStore.getState().setRoom(room);
    });

    socket.on('room:kicked', ({ reason }) => {
      store.clearRoom();
      const currentLang = useGameStore.getState().language;
      const dict = currentLang === 'es' ? es : en;
      
      let message = '';
      if (reason === 'afkKickReason') {
        message = dict.youKickedAfk || 'You have been kicked for inactivity';
      } else if (reason === 'lobbyTimeoutReason') {
        message = dict.youKickedLobbyTimeout || 'The room has been closed due to prolonged inactivity (10 minutes maximum).';
      } else {
        message = dict.youKickedByHost || 'You have been kicked by the host';
      }
      
      useToastStore.getState().addToast(message, 'error');
    });

    socket.on('room:list', () => {
      // Handled by LobbyScreen component via emit + callback
    });

    socket.on('room:error', ({ message }) => {
      store.setConnectionError(message);
    });

    // ---- Game events -------------------------------------------------------
    socket.on('game:state', (state) => {
      useGameStore.getState().setGameState(state);
    });

    socket.on('game:round_start', ({ round, blocks }) => {
      const { gameState } = useGameStore.getState();
      if (gameState) {
        useGameStore.getState().setGameState({
          ...gameState,
          phase: 'DANCING',
          round,
          winnerColor: null,
          blocks,
        });
      } else {
        useGameStore.getState().updateBlocks(blocks);
      }
    });

    socket.on('game:announce', ({ winnerColor }) => {
      const { gameState } = useGameStore.getState();
      if (gameState) {
        useGameStore.getState().setGameState({
          ...gameState,
          phase: 'ANNOUNCING',
          winnerColor,
        });
      } else {
        useGameStore.getState().setWinnerColor(winnerColor);
      }
    });

    socket.on('game:eliminate', ({ eliminatedBlocks }) => {
      const { gameState } = useGameStore.getState();
      if (!gameState) return;
      // Mark eliminated blocks as inactive
      const updatedBlocks = gameState.blocks.map((row) =>
        row.map((block) => {
          const wasEliminated = eliminatedBlocks.some(
            (e) => e.row === block.row && e.col === block.col,
          );
          return wasEliminated ? { ...block, isActive: false } : block;
        }),
      );
      useGameStore.getState().updateBlocks(updatedBlocks);
    });

    socket.on('game:player_died', ({ playerId }) => {
      useGameStore.getState().markPlayerDead(playerId);
    });

    socket.on('game:over', ({ winnerId }) => {
      useGameStore.getState().setGameOver(winnerId);
    });

    socket.on('chat:broadcast', (message) => {
      useGameStore.getState().addChatMessage(message);
    });

    // Connect
    if (!socket.connected) socket.connect();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('pong');
      socket.off('room:updated');
      socket.off('room:list');
      socket.off('room:error');
      socket.off('game:state');
      socket.off('game:round_start');
      socket.off('game:announce');
      socket.off('game:eliminate');
      socket.off('game:player_died');
      socket.off('game:over');
      socket.off('chat:broadcast');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return getSocket();
}
