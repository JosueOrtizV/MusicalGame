import { describe, test, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { Room, GameState } from '@/src/shared/types';

describe('gameStore', () => {
  const initialState = useGameStore.getState();

  beforeEach(() => {
    // Reset Zustand store state before each test
    useGameStore.setState(initialState, true);
  });

  test('initializes with default state', () => {
    const state = useGameStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.connectionError).toBeNull();
    expect(state.room).toBeNull();
    expect(state.screen).toBe('home');
    expect(state.volume).toBe(0.5);
    expect(state.isMuted).toBe(false);
    expect(state.language).toBe('en');
    expect(state.chatMessages).toEqual([]);
  });

  test('setConnected updates connection status', () => {
    useGameStore.getState().setConnected(true);
    expect(useGameStore.getState().isConnected).toBe(true);

    useGameStore.getState().setConnected(false);
    expect(useGameStore.getState().isConnected).toBe(false);
  });

  test('setConnectionError updates error state', () => {
    useGameStore.getState().setConnectionError('Failed to connect');
    expect(useGameStore.getState().connectionError).toBe('Failed to connect');

    useGameStore.getState().setConnectionError(null);
    expect(useGameStore.getState().connectionError).toBeNull();
  });

  test('updateLocalCosmetics merges cosmetic choices', () => {
    const originalCosmetics = useGameStore.getState().localCosmetics;
    expect(originalCosmetics.companionType).toBe('none');

    useGameStore.getState().updateLocalCosmetics({ companionType: 'kitty', primaryColor: '#FF0000' });

    const newCosmetics = useGameStore.getState().localCosmetics;
    expect(newCosmetics.companionType).toBe('kitty');
    expect(newCosmetics.primaryColor).toBe('#FF0000');
    // Ensure rest of cosmetics are preserved
    expect(newCosmetics.headphonesEnabled).toBe(originalCosmetics.headphonesEnabled);
  });

  test('setLanguage changes language preference', () => {
    useGameStore.getState().setLanguage('es');
    expect(useGameStore.getState().language).toBe('es');
  });

  test('volume and mute triggers mutate correctly', () => {
    useGameStore.getState().setVolume(0.85);
    expect(useGameStore.getState().volume).toBe(0.85);

    // Test clamping
    useGameStore.getState().setVolume(1.5);
    expect(useGameStore.getState().volume).toBe(1);

    useGameStore.getState().setVolume(-0.5);
    expect(useGameStore.getState().volume).toBe(0);

    useGameStore.getState().toggleMute();
    expect(useGameStore.getState().isMuted).toBe(true);

    useGameStore.getState().toggleMute();
    expect(useGameStore.getState().isMuted).toBe(false);
  });

  test('setRoom navigates screen and syncs token and cosmetics', () => {
    const localPlayerId = 'socket-1';
    useGameStore.getState().setLocalPlayer(localPlayerId, 'P1');
    useGameStore.getState().updateLocalCosmetics({ primaryColor: '#FF0000' });

    const mockRoom: Room = {
      id: 'ROOM-1',
      hostId: 'socket-1',
      status: 'waiting',
      players: [
        {
          id: 'socket-1',
          name: 'P1',
          isAlive: true,
          lives: 3,
          isReady: false,
          isHost: true,
          color: '#00FF00',
          position: { x: 0, z: 0 },
          cosmetics: {
            companionType: 'none',
            headphonesEnabled: true,
            backpackEnabled: true,
            skinMaterial: 'matte',
            primaryColor: '#00FF00', // server conflict resolved color
            shoesColor: '#00FF00',
            visorColor: '#00FF00',
            heartColor: '#00FF00',
            headphonesColor: '#00FF00',
            backpackColor: '#00FF00',
            companionColor: '#00FF00',
          }
        }
      ],
      visibility: 'public',
      maxPlayers: 8,
      speed: 'NORMAL'
    };

    useGameStore.getState().setRoom(mockRoom);

    const state = useGameStore.getState();
    expect(state.room).toEqual(mockRoom);
    // Should navigate to lobby since local player is in the room list and joining from home screen
    expect(state.screen).toBe('lobby');
    // Conflict resolution: local primaryColor updated to server color
    expect(state.localCosmetics.primaryColor).toBe('#00FF00');
  });

  test('setGameState updates state and handles transitions based on phase', () => {
    const localPlayerId = 'socket-1';
    useGameStore.getState().setLocalPlayer(localPlayerId, 'P1');
    useGameStore.getState().setScreen('lobby');

    const mockGameState: GameState = {
      phase: 'DANCING',
      round: 1,
      timeLeft: 15,
      winnerColor: null,
      blocks: [],
      players: [
        {
          id: 'socket-1',
          name: 'P1',
          isAlive: true,
          lives: 3,
          isReady: true,
          isHost: true,
          color: '#00FF00',
          position: { x: 0, z: 0 },
          cosmetics: {
            companionType: 'none',
            headphonesEnabled: true,
            backpackEnabled: true,
            skinMaterial: 'matte',
            primaryColor: '#00FF00',
            shoesColor: '#00FF00',
            visorColor: '#00FF00',
            heartColor: '#00FF00',
            headphonesColor: '#00FF00',
            backpackColor: '#00FF00',
            companionColor: '#00FF00',
          }
        }
      ],
      winnerId: null,
      isChaosMode: false,
      speed: 'NORMAL'
    };

    useGameStore.getState().setGameState(mockGameState);

    const state = useGameStore.getState();
    expect(state.gameState).toEqual(mockGameState);
    // Should auto-navigate from lobby to game screen on active game phases
    expect(state.screen).toBe('game');
  });
});
