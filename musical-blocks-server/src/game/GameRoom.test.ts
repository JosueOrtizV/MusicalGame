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
      sockets: {
        sockets: new Map(),
      },
    } as unknown as SocketServer;
    
    room = new GameRoom(ioMock, 'host-1', 'HostPlayer', 'private', vi.fn());
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
    room.addPlayer('player-2', 'PlayerTwo');
    
    room['status'] = 'playing';
    room['currentPhase'] = 'ELIMINATING';
    
    room.removePlayer('player-2');
    
    expect(room.getStatus()).toBe('playing');
    expect(room['currentPhase']).toBe('ELIMINATING');
  });

  it('cancels countdown when fewer than 2 players are present', () => {
    room.addPlayer('player-2', 'PlayerTwo');
    room.setPlayerReady('player-2', true);
    
    const res = room.startGame('host-1');
    expect(res.ok).toBe(true);
    
    expect(room['countdownInterval']).not.toBeNull();
    
    room.removePlayer('player-2');
    
    expect(room['countdownInterval']).toBeNull();
  });

  it('auto-cleans up game over timeout on destroy to prevent memory leaks', () => {
    room['gameOverTimeout'] = setTimeout(() => {}, 10000) as unknown as NodeJS.Timeout;
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    room.destroy();
    
    expect(clearTimeoutSpy).toHaveBeenCalledWith(expect.anything());
  });

  // QA-03: Chat handling
  it('handles chat restrictions: allows in lobby, truncates, sanitizes, blocks alive during playing', () => {
    room.addPlayer('player-2', 'PlayerTwo');
    
    // In lobby, player can chat
    room.handleChat('player-2', '<script>alert("xss")</script>Hello World!');
    expect(ioMock.emit).toHaveBeenCalledWith('chat:broadcast', expect.objectContaining({
      senderId: 'player-2',
      text: 'scriptalert(xss)/scriptHello World!',
    }));

    // Dev command /round in lobby by host
    room.handleChat('host-1', '/round 5');
    expect(room['startingRound']).toBe(5);

    // During playing, alive players cannot chat
    room['status'] = 'playing';
    ioMock.emit.mockClear();
    room.handleChat('player-2', 'Secret message');
    expect(ioMock.emit).not.toHaveBeenCalledWith('chat:broadcast', expect.anything());
  });

  // QA-04: Kick player
  it('kicks a player and broadcasts notification', () => {
    room.addPlayer('player-2', 'PlayerTwo');
    expect(room.playerCount()).toBe(2);

    const targetSocket = { emit: vi.fn(), leave: vi.fn() };
    ioMock.sockets.sockets.set('player-2', targetSocket);

    room.kickPlayer('player-2', 'kickedByHost');

    expect(targetSocket.emit).toHaveBeenCalledWith('room:kicked', { reason: 'kickedByHost' });
    expect(room.playerCount()).toBe(1);
  });

  // QA-05: AFK checks
  it('kicks AFK host or player during checkAFK', () => {
    room.addPlayer('player-2', 'PlayerTwo');
    
    // Advance timers past AFK limit for test (1000ms interval, PLAYER_AFK_LIMIT is 5000ms)
    const p2 = room['players'].get('player-2');
    if (p2) {
      p2.lastActivityTime = Date.now() - 10000;
    }

    room['checkAFK']();
    expect(room.playerCount()).toBe(1); // player-2 kicked
  });

  // QA-06: Auto-start countdown sequence
  it('triggers 20s silent timer then 10s visible countdown when ready threshold met', () => {
    // Stop afk interval during this timer test
    if (room['afkInterval']) clearInterval(room['afkInterval']);

    room.addPlayer('player-2', 'PlayerTwo');
    expect(room['autoStartSilentTimeout']).toBeNull();

    room.setPlayerReady('player-2', true); // Both host and p2 ready
    expect(room['autoStartSilentTimeout']).not.toBeNull();

    // Advance 20 seconds for silent timer
    vi.advanceTimersByTime(20000);

    expect(room['countdownType']).toBe('auto');
    expect(ioMock.emit).toHaveBeenCalledWith('room:auto_start_countdown', expect.objectContaining({
      seconds: 10,
      isAuto: true,
    }));
  });

  // QA-07: Settings update sanitization
  it('clamps and sanitizes room settings on updateSettings', () => {
    room.updateSettings({
      maxColors: 99,
      gameSpeed: 'INVALID' as any,
      maxLives: 10 as any,
      suddenDeathMode: 'UNKNOWN' as any,
      maxPlayers: 1,
    });

    const settings = room.toRoom().settings;
    expect(settings.maxColors).toBe(10);
    expect(settings.gameSpeed).toBe('NORMAL');
    expect(settings.maxLives).toBe(3);
    expect(settings.suddenDeathMode).toBe('NORMAL');
    expect(settings.maxPlayers).toBe(2); // clamped to current player count (min 2)
  });

  // QA-10: Color conflict resolution
  it('reverts requested primary color if already taken by another player', () => {
    room.addPlayer('player-2', 'PlayerTwo');
    const p1 = room['players'].get('host-1');
    const p2 = room['players'].get('player-2');
    
    if (p1 && p2) {
      p1.color = '#FF0000';
      p2.color = '#00FF00';

      // Player 2 tries to pick Player 1's color #FF0000
      room.setPlayerCosmetics('player-2', { primaryColor: '#FF0000' } as any);
      
      // Should revert to p2's existing color #00FF00
      expect(p2.cosmetics?.primaryColor).toBe('#00FF00');
    }
  });
});
