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
  ChatMessage,
  PlayerCosmetics,
  RoomSettings,
} from '@/src/shared/types';
import { persist } from 'zustand/middleware';

// ---------------------------------------------------------------------------
//  Store shape
// ---------------------------------------------------------------------------
interface GameStore {
  // ---- Connection ----------------------------------------------------------
  isConnected: boolean;
  latency: number;
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
  screen: 'home' | 'lobby' | 'game' | 'dead' | 'winner' | 'sp_game';
  roomListRefreshKey: number; // increment to trigger refresh

  // ---- Single Player Mode --------------------------------------------------
  gameMode: 'multiplayer' | 'singleplayer';
  spHighScore: number;
  spPlayerId: string;
  spLastScore: number;
  spLastRounds: number;
  spSettings: RoomSettings;
  hostSettings: RoomSettings;

  // ---- Settings ------------------------------------------------------------
  isMuted: boolean;
  volume: number;
  language: 'en' | 'es';
  hasSetLanguage: boolean;
  pressedDirections: Record<'UP' | 'DOWN' | 'LEFT' | 'RIGHT', boolean>;
  cameraYaw: number;
  dashCooldownEnd: number;
  isPointerLocked: boolean;
  cameraMode: 'movable' | 'static';
  hasSelectedCameraMode: boolean;
  mobileControlType: 'joystick' | 'wasd';
  wasAliveThisRound: boolean;

  // ---- Actions -------------------------------------------------------------
  setConnected: (v: boolean) => void;
  setLatency: (v: number) => void;
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
  setDirectionPressed: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', pressed: boolean) => void;
  triggerDashCooldown: () => void;
  setCameraMode: (mode: 'movable' | 'static') => void;
  setHasSelectedCameraMode: (selected: boolean) => void;
  setMobileControlType: (type: 'joystick' | 'wasd') => void;
  setGameMode: (mode: 'multiplayer' | 'singleplayer') => void;
  setSpHighScore: (score: number) => void;
  setSpLastScore: (score: number) => void;
  setSpLastRounds: (rounds: number) => void;
  initSpPlayerId: () => void;
  setSpSettings: (settings: RoomSettings) => void;
  setHostSettings: (settings: RoomSettings) => void;

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
      latency: 0,
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
          primaryColor: randomColor, // Guardar color preferido de ficha
          shoesColor: randomColor,
          visorColor: randomColor,
          heartColor: randomColor,
          headphonesColor: randomColor,
          backpackColor: randomColor,
          companionColor: randomColor,
          danceStyle: 'random',
          idleStyle: 'random',
          celebrateStyle: 'random',
        };
      })(),

      // ---- Game state
      gameState: null,

      // ---- Chat
      chatMessages: [],

      // ---- UI
      screen: 'home',
      roomListRefreshKey: 0,

      // ---- Single Player Mode
      gameMode: 'multiplayer',
      spHighScore: 0,
      spPlayerId: '',
      spLastScore: 0,
      spLastRounds: 0,
      spSettings: {
        maxColors: 6,
        gameSpeed: 'NORMAL',
        maxLives: 3,
        isBlindMode: false,
        suddenDeathMode: 'NORMAL',
        enableCollisions: false,
        maxPlayers: 8
      },
      hostSettings: {
        maxColors: 6,
        gameSpeed: 'NORMAL',
        maxLives: 3,
        isBlindMode: false,
        suddenDeathMode: 'NORMAL',
        enableCollisions: false,
        maxPlayers: 8
      },

      // ---- Settings (defaults, can be overridden)
      isMuted: false,
      volume: 0.5,
      language: 'en',
      hasSetLanguage: false,
      pressedDirections: { UP: false, DOWN: false, LEFT: false, RIGHT: false },
      cameraYaw: 0,
      dashCooldownEnd: 0,
      isPointerLocked: false,
      cameraMode: 'movable',
      hasSelectedCameraMode: false,
      mobileControlType: 'joystick',
      wasAliveThisRound: false,

       // ---- Actions
      setConnected: (v) => set((s) => { s.isConnected = v; }),
      setLatency: (v) => set((s) => { s.latency = v; }),
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

          // Sync localCosmetics primaryColor with authoritative player cosmetics from the server if they differ (color conflict resolution)
          const me = room.players.find((p) => p.id === s.localPlayerId);
          if (me && me.cosmetics) {
            // Sincronizar ÚNICAMENTE el color de la ficha de lobby si el servidor nos asignó uno diferente por estar ocupado
            if (me.cosmetics.primaryColor && me.cosmetics.primaryColor !== s.localCosmetics.primaryColor) {
              s.localCosmetics.primaryColor = me.cosmetics.primaryColor;
            }
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
          if (name) {
            s.localPlayerName = name;
          }
        }),

      clearRoom: () =>
        set((s) => {
          s.room = null;
          s.gameState = null;
          s.screen = 'home';
          s.sessionToken = null;
          s.wasAliveThisRound = false;
          

        }),

      setGameState: (state) =>
        set((s) => {
          s.gameState = state;

          // Track if player started this round alive
          if (state.phase === 'LOBBY' || state.phase === 'STARTING') {
            s.wasAliveThisRound = false;
          } else if (state.phase === 'DANCING' || state.phase === 'ANNOUNCING') {
            const localPlayer = state.players.find(p => p.id === s.localPlayerId);
            if (localPlayer && localPlayer.isAlive) {
              s.wasAliveThisRound = true;
            }
          }
          
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
      setLanguage: (lang) => set((s) => {
        s.language = lang;
        s.hasSetLanguage = true;
      }),
      setDirectionPressed: (dir, pressed) => set((s) => { s.pressedDirections[dir] = pressed; }),
      triggerDashCooldown: () => set((s) => { s.dashCooldownEnd = Date.now() + 5000; }),
      setCameraMode: (mode) => set((s) => { s.cameraMode = mode; }),
      setHasSelectedCameraMode: (selected) => set((s) => { s.hasSelectedCameraMode = selected; }),
      setMobileControlType: (type) => set((s) => { s.mobileControlType = type; }),
      setGameMode: (mode) => set((s) => { s.gameMode = mode; }),
      setSpHighScore: (score) => set((s) => { s.spHighScore = score; }),
      setSpLastScore: (score) => set((s) => { s.spLastScore = score; }),
      setSpLastRounds: (rounds) => set((s) => { s.spLastRounds = rounds; }),
      initSpPlayerId: () => set((s) => {
        if (!s.spPlayerId) {
          s.spPlayerId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }
      }),
      setSpSettings: (settings) => set((s) => { s.spSettings = settings; }),
      setHostSettings: (settings) => set((s) => { s.hostSettings = settings; }),
      
      addChatMessage: (msg) => set((s) => {
        if (s.chatMessages.some((m) => m.id === msg.id)) return;
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
      name: 'voxelrave-settings',
      partialize: (state) => ({
        language: state.language,
        hasSetLanguage: state.hasSetLanguage,
        volume: state.volume,
        isMuted: state.isMuted,
        cameraMode: state.cameraMode,
        hasSelectedCameraMode: state.hasSelectedCameraMode,
        mobileControlType: state.mobileControlType,
        localPlayerName: state.localPlayerName,
        localCosmetics: state.localCosmetics,
        gameMode: state.gameMode,
        spHighScore: state.spHighScore,
        spPlayerId: state.spPlayerId,
        spLastScore: state.spLastScore,
        spLastRounds: state.spLastRounds,
        spSettings: state.spSettings,
        hostSettings: state.hostSettings
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
