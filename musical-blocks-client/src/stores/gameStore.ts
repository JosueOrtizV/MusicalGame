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
  ChatMessage,
  PlayerCosmetics,
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
  sessionToken: string | null;
  localCosmetics: PlayerCosmetics;

  // ---- Game state ----------------------------------------------------------
  gameState: GameState | null;

  // ---- Chat ----------------------------------------------------------------
  chatMessages: ChatMessage[];

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
  updateLocalCosmetics: (cosmetics: Partial<PlayerCosmetics>) => void;

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

  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
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
      sessionToken: null,
      localCosmetics: (() => {
        const colors = [
          '#F6E05E', '#FC8181', '#68D391', '#76E4F7', '#B794F4', 
          '#FBD38D', '#F687B3', '#90CDF4', '#39FF14', '#FF007F', 
          '#0066FF', '#FF5500'
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)] || '#39FF14';
        return {
          companionType: 'none',
          headphonesEnabled: true,
          backpackEnabled: true,
          skinMaterial: 'matte',
          shoesColor: randomColor,
          visorColor: randomColor,
          heartColor: randomColor,
          headphonesColor: randomColor,
          backpackColor: randomColor,
          companionColor: randomColor,
        };
      })(),

      // ---- Game state
      gameState: null,

      // ---- Chat
      chatMessages: [],

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
      updateLocalCosmetics: (cosmetics) =>
        set((s) => {
          s.localCosmetics = { ...s.localCosmetics, ...cosmetics };
        }),

      setRoom: (room) =>
        set((s) => {
          s.room = room;
          
          if (room.sessionToken) {
            s.sessionToken = room.sessionToken;
          }

          // Sync localCosmetics with authoritative player cosmetics from the server if they differ
          const me = room.players.find((p) => p.id === s.localPlayerId);
          if (me && me.cosmetics) {
            const keys: Array<keyof PlayerCosmetics> = [
              'companionType',
              'headphonesEnabled',
              'backpackEnabled',
              'skinMaterial',
              'primaryColor',
              'shoesColor',
              'visorColor',
              'heartColor',
              'headphonesColor',
              'backpackColor',
              'companionColor',
            ];
            let isDifferent = false;
            for (const key of keys) {
              if (me.cosmetics[key] !== s.localCosmetics[key]) {
                isDifferent = true;
                break;
              }
            }
            if (isDifferent) {
              s.localCosmetics = {
                ...s.localCosmetics,
                ...me.cosmetics,
              };
            }
          }
          
          // Sync URL query parameter for private rooms
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (room.visibility === 'private') {
              url.searchParams.set('room', room.id.toUpperCase());
            } else {
              url.searchParams.delete('room');
            }
            window.history.replaceState({}, '', url.pathname + url.search);
          }
          
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
          s.sessionToken = null;
          
          // Clear URL query parameter
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('room');
            window.history.replaceState({}, '', url.pathname + url.search);
          }
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
          if (state.phase === 'STARTING' || state.phase === 'DANCING' || state.phase === 'ANNOUNCING' || state.phase === 'ELIMINATING' || state.phase === 'ROUND_END') {
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
      
      addChatMessage: (msg) => set((s) => {
        const msgWithLocal = {
          ...msg,
          localTimestamp: Date.now()
        };
        s.chatMessages.push(msgWithLocal);
        if (s.chatMessages.length > 100) s.chatMessages.shift();
      }),
      clearChat: () => set((s) => { s.chatMessages = []; }),
    })),
    {
      name: 'musical-blocks-settings',
      partialize: (state) => ({
        language: state.language,
        volume: state.volume,
        isMuted: state.isMuted,
        localPlayerName: state.localPlayerName,
        localCosmetics: state.localCosmetics
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
