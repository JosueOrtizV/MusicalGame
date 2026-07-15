'use client';

import { useEffect } from 'react';
import { getSocket, setClockOffset } from '@/src/lib/socketClient';
import { useGameStore } from '@/src/stores/gameStore';
import { useToastStore } from '@/src/stores/toastStore';

import { en } from '@/src/locales/en';
import { es } from '@/src/locales/es';
import { Room, GameState, BlockColor, GameBlock, ChatMessage } from '@/src/shared/types';

// ---------------------------------------------------------------------------
//  useSocket — connects to server, wires all ServerEvents → Zustand store
// ---------------------------------------------------------------------------
export function useSocket() {
  const store = useGameStore();
  const gameMode = store.gameMode;

  useEffect(() => {
    const socket = getSocket();
    if (gameMode === 'singleplayer') {
      if (socket.connected) socket.disconnect();
      return;
    }
    const onConnect = () => {
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
    };

    const onDisconnect = () => {
      store.setConnected(false);
    };

    const onConnectError = (err: Error) => {
      const errMsg = err.message || 'Cannot connect to server. Is it running?';
      store.setConnectionError(errMsg);
      useToastStore.getState().addToast(errMsg, 'error');
    };

    // ---- Clock sync & Latency ----------------------------------------------
    const onPong = ({ serverTime, clientTime }: { serverTime: number; clientTime: number }) => {
      const rtt = Date.now() - clientTime;
      setClockOffset(serverTime - (clientTime + rtt / 2));
      store.setLatency(rtt);
      if (!useGameStore.getState().isConnected) {
        store.setConnected(true);
      }
    };

    // ---- Room events -------------------------------------------------------
    const onRoomUpdated = ({ room }: { room: Room }) => {
      useGameStore.getState().setRoom(room);
    };

    const onRoomKicked = ({ reason }: { reason: string }) => {
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
    };

    const onRoomError = ({ message }: { message: string }) => {
      store.setConnectionError(message);
    };

    // ---- Game events -------------------------------------------------------
    const onGameState = (state: GameState) => {
      useGameStore.getState().setGameState(state);
    };

    const onGameRoundStart = ({ round, blocks }: { round: number; blocks: GameBlock[][] }) => {
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
    };

    const onGameAnnounce = ({ winnerColor }: { winnerColor: BlockColor | null }) => {
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
    };

    const onGameEliminate = ({ eliminatedBlocks }: { eliminatedBlocks: { row: number; col: number }[] }) => {
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
    };

    const onGamePlayerDied = ({ playerId }: { playerId: string }) => {
      useGameStore.getState().markPlayerDead(playerId);
    };

    const onGameOver = ({ winnerId }: { winnerId: string | null }) => {
      useGameStore.getState().setGameOver(winnerId);
    };

    const onChatBroadcast = (message: ChatMessage) => {
      useGameStore.getState().addChatMessage(message);
    };

    // Register all listeners BEFORE checking connection state
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('pong', onPong);
    socket.on('room:updated', onRoomUpdated);
    socket.on('room:kicked', onRoomKicked);
    socket.on('room:error', onRoomError);
    socket.on('game:state', onGameState);
    socket.on('game:round_start', onGameRoundStart);
    socket.on('game:announce', onGameAnnounce);
    socket.on('game:eliminate', onGameEliminate);
    socket.on('game:player_died', onGamePlayerDied);
    socket.on('game:over', onGameOver);
    socket.on('chat:broadcast', onChatBroadcast);

    // If socket is already connected, invoke onConnect handler immediately
    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    // Dynamic latency checks (5s interval, pauses when tab is hidden)
    const interval = setInterval(() => {
      if (socket.connected && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        socket.emit('ping', { clientTime: Date.now() });
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && socket.connected) {
        socket.emit('ping', { clientTime: Date.now() });
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('pong', onPong);
      socket.off('room:updated', onRoomUpdated);
      socket.off('room:kicked', onRoomKicked);
      socket.off('room:error', onRoomError);
      socket.off('game:state', onGameState);
      socket.off('game:round_start', onGameRoundStart);
      socket.off('game:announce', onGameAnnounce);
      socket.off('game:eliminate', onGameEliminate);
      socket.off('game:player_died', onGamePlayerDied);
      socket.off('game:over', onGameOver);
      socket.off('chat:broadcast', onChatBroadcast);

      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode]);

  return getSocket();
}
