'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  GameState,
  GamePhase,
  Player,
  Room,
  BlockColor,
  GameBlock,
  Direction,
} from '@/src/shared/types';
import { persist } from 'zustand/middleware';

// ---------------------------------------------------------------------------
//  Store shape
// ---------------------------------------------------------------------------
interface GameStore {
  // ---- Connection ----------------------------------------------------------
  isConnected: boolean;
  connectionError: string | null;

  // ---- Room ----------------------------------------------------------------
  room: Room | null;
  localPlayerId: string | null;
  localPlayerName: string;

  // ---- Game state ----------------------------------------------------------
  gameState: GameState | null;

  // ---- UI state ------------------------------------------------------------
  screen: 'home' | 'lobby' | 'game' | 'dead' | 'winner';
  roomListRefreshKey: number; // increment to trigger refresh

  // ---- Settings ------------------------------------------------------------
  isMuted: boolean;
  volume: number;
  language: 'en' | 'es';
  pressedDirections: Record<Direction, boolean>;

  // ---- Actions -------------------------------------------------------------
  setConnected: (v: boolean) => void;
  setConnectionError: (msg: string | null) => void;

  setRoom: (room: Room) => void;
  setLocalPlayer: (id: string, name: string) => void;
  clearRoom: () => void;

  setGameState: (state: GameState) => void;
  updateBlocks: (blocks: GameBlock[][]) => void;
  setWinnerColor: (color: BlockColor | null) => void;
  markPlayerDead: (playerId: string) => void;
  setGameOver: (winnerId: string | null) => void;

  setScreen: (screen: GameStore['screen']) => void;
  setPlayerName: (name: string) => void;
  refreshRoomList: () => void;

  toggleMute: () => void;
  setVolume: (volume: number) => void;
  setLanguage: (lang: 'en' | 'es') => void;
  setDirectionPressed: (dir: Direction, pressed: boolean) => void;
}

// ---------------------------------------------------------------------------
//  Zustand store with Immer middleware for ergonomic mutations
// ---------------------------------------------------------------------------
export const useGameStore = create<GameStore>()(
  persist(
    immer((set) => ({
      // ---- Connection
      isConnected: false,
      connectionError: null,

      // ---- Room
      room: null,
      localPlayerId: null,
      localPlayerName: '',

      // ---- Game state
      gameState: null,

      // ---- UI
      screen: 'home',
      roomListRefreshKey: 0,

      // ---- Settings (defaults, can be overridden)
      isMuted: false,
      volume: 0.5,
      language: 'en',
      pressedDirections: { UP: false, DOWN: false, LEFT: false, RIGHT: false },

      // ---- Actions
      setConnected: (v) => set((s) => { s.isConnected = v; }),
      setConnectionError: (msg) => set((s) => { s.connectionError = msg; }),

      setRoom: (room) =>
        set((s) => {
          s.room = room;
          
          // Only auto-navigate to lobby if:
          // 1. The local player is actually IN the room list
          // 2. Joining fresh from home screen OR room was reset after game
          const isLocalPlayerInRoom = room.players.some(p => p.id === s.localPlayerId);
          
          if (isLocalPlayerInRoom) {
            if (s.screen === 'home') {
              s.screen = 'lobby';
            } else if (room.status === 'waiting' && (s.screen === 'winner' || s.screen === 'dead' || s.screen === 'game')) {
              s.screen = 'lobby';
              s.gameState = null;
            }
          } else {
            // If we are NOT in the room list, we shouldn't be in the lobby/game screens
            if (s.screen !== 'home') {
              s.room = null;
              s.gameState = null;
              s.screen = 'home';
            }
          }
        }),

      setLocalPlayer: (id, name) =>
        set((s) => {
          s.localPlayerId = id;
          s.localPlayerName = name;
        }),

      clearRoom: () =>
        set((s) => {
          s.room = null;
          s.gameState = null;
          s.screen = 'home';
        }),

      setGameState: (state) =>
        set((s) => {
          s.gameState = state;
          
          // Check if local player was revived by the server
          if (s.screen === 'dead') {
            const me = state.players.find(p => p.id === s.localPlayerId);
            if (me && me.isAlive) {
              s.screen = 'game';
            }
          }

          // Auto-navigate screens based on phase
          if (state.phase === 'DANCING' || state.phase === 'ANNOUNCING' || state.phase === 'ELIMINATING' || state.phase === 'ROUND_END') {
            if (s.screen === 'lobby') s.screen = 'game';
          }
          if (state.phase === 'GAME_OVER') {
            s.screen = 'winner';
          }
        }),

      updateBlocks: (blocks) =>
        set((s) => {
          if (s.gameState) s.gameState.blocks = blocks;
        }),

      setWinnerColor: (color) =>
        set((s) => {
          if (s.gameState) s.gameState.winnerColor = color;
        }),

      markPlayerDead: (playerId) =>
        set((s) => {
          if (!s.gameState) return;
          const p = s.gameState.players.find((pl) => pl.id === playerId);
          if (p) {
            p.isAlive = false;
            if (playerId === s.localPlayerId) s.screen = 'dead';
          }
        }),

      setGameOver: (winnerId) =>
        set((s) => {
          if (s.gameState) {
            s.gameState.phase = 'GAME_OVER';
            s.gameState.winnerId = winnerId;
          }
          s.screen = 'winner';
        }),

      setScreen: (screen) => set((s) => { s.screen = screen; }),
      setPlayerName: (name) => set((s) => { s.localPlayerName = name; }),
      refreshRoomList: () => set((s) => { s.roomListRefreshKey++; }),

      toggleMute: () => set((s) => { s.isMuted = !s.isMuted; }),
      setVolume: (volume) => set((s) => { s.volume = Math.max(0, Math.min(1, volume)); }),
      setLanguage: (lang) => set((s) => { s.language = lang; }),
      setDirectionPressed: (dir, pressed) => set((s) => { s.pressedDirections[dir] = pressed; }),
    })),
    {
      name: 'musical-blocks-settings',
      partialize: (state) => ({
        language: state.language,
        volume: state.volume,
        isMuted: state.isMuted
      }),
    }
  )
);

// ---------------------------------------------------------------------------
//  Selectors (memoized by Zustand's shallow compare)
// ---------------------------------------------------------------------------
export const selectLocalPlayer = (s: GameStore): Player | null =>
  s.gameState?.players.find((p) => p.id === s.localPlayerId) ?? null;

export const selectIsHost = (s: GameStore): boolean =>
  s.room?.hostId === s.localPlayerId;

export const selectPhase = (s: GameStore): GamePhase | null =>
  s.gameState?.phase ?? null;
