import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameRoom } from './GameRoom';
import { Server as SocketServer } from 'socket.io';

describe('GameRoom', () => {
  let ioMock: any;
  let room: GameRoom;

  beforeEach(() => {
    vi.useFakeTimers();
    ioMock = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as unknown as SocketServer;
    
    room = new GameRoom(ioMock, 'host-1', 'HostPlayer', 'private', vi.fn());
    // Suppress console logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    room.destroy();
    vi.restoreAllMocks();
  });

  it('transfers host when current host disconnects', () => {
    room.addPlayer('player-2', 'PlayerTwo');
    expect(room.toRoom().hostId).toBe('host-1');
    
    room.removePlayer('host-1');
    expect(room.toRoom().hostId).toBe('player-2');
  });

  it('does not end game prematurely if players die during ELIMINATING transition', () => {
    // Setup game with 2 players
    room.addPlayer('player-2', 'PlayerTwo');
    
    // Force room into playing state & ELIMINATING phase
    room['status'] = 'playing';
    room['currentPhase'] = 'ELIMINATING';
    
    // Simulate player 2 disconnecting
    room.removePlayer('player-2');
    
    // Game should still be running since the phase is ELIMINATING
    expect(room.getStatus()).toBe('playing');
    expect(room['currentPhase']).toBe('ELIMINATING');
  });

  it('cancels countdown when fewer than 2 players are present', () => {
    room.addPlayer('player-2', 'PlayerTwo');
    room.setPlayerReady('player-2', true);
    
    // Host starts countdown
    const res = room.startGame('host-1');
    expect(res.ok).toBe(true);
    
    // Countdown should start
    expect(room['countdownInterval']).not.toBeNull();
    
    // Player 2 leaves
    room.removePlayer('player-2');
    
    // Countdown should be cancelled
    expect(room['countdownInterval']).toBeNull();
  });

  it('auto-cleans up game over timeout on destroy to prevent memory leaks', () => {
    room['gameOverTimeout'] = setTimeout(() => {}, 10000) as unknown as NodeJS.Timeout;
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    room.destroy();
    
    expect(clearTimeoutSpy).toHaveBeenCalledWith(expect.anything());
  });
});
