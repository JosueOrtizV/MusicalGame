import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RoomRegistry } from '../game/RoomRegistry';
import { registerHandlers } from './handlers';
import { Server as SocketServer } from 'socket.io';
import { generateSessionToken } from '../utils/crypto';

describe('Socket Handlers & Security', () => {
  let ioMock: any;
  let registry: RoomRegistry;
  let socketMock: any;
  let eventCallbacks: Record<string, Function>;
  let useMiddlewares: Function[];

  beforeEach(() => {
    vi.useFakeTimers();
    eventCallbacks = {};
    useMiddlewares = [];

    ioMock = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as unknown as SocketServer;

    registry = new RoomRegistry(ioMock);

    socketMock = {
      id: 'test-socket-123',
      handshake: { address: '127.0.0.1', headers: {} },
      on: vi.fn((event: string, callback: Function) => {
        eventCallbacks[event] = callback;
      }),
      emit: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
      use: vi.fn((middleware: Function) => {
        useMiddlewares.push(middleware);
      }),
    };

    registerHandlers(ioMock, socketMock, registry);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers expected socket event handlers', () => {
    expect(socketMock.on).toHaveBeenCalledWith('ping', expect.any(Function));
    expect(socketMock.on).toHaveBeenCalledWith('room:create', expect.any(Function));
    expect(socketMock.on).toHaveBeenCalledWith('room:join_public', expect.any(Function));
    expect(socketMock.on).toHaveBeenCalledWith('chat:send', expect.any(Function));
    expect(socketMock.on).toHaveBeenCalledWith('player:move', expect.any(Function));
  });

  it('enforces room:create rate limiting (max 3 rooms per minute)', () => {
    const createCb = vi.fn();

    // Call 1-3 (should succeed)
    eventCallbacks['room:create']({ playerName: 'Alice', visibility: 'public' }, createCb);
    eventCallbacks['room:create']({ playerName: 'Alice', visibility: 'public' }, createCb);
    eventCallbacks['room:create']({ playerName: 'Alice', visibility: 'public' }, createCb);

    expect(createCb).toHaveBeenCalledTimes(3);

    // Call 4 (exceeds limit -> socket emits error)
    eventCallbacks['room:create']({ playerName: 'Alice', visibility: 'public' }, createCb);

    expect(createCb).toHaveBeenCalledTimes(3); // 4th call callback not executed
    expect(socketMock.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ message: expect.stringContaining('demasiadas salas') })
    );
  });

  it('enforces chat:send rate limiting (max 5 messages per 5 seconds)', () => {
    // Create room first
    const room = registry.create('test-socket-123', 'Alice', 'public');
    registry.setPlayerRoom('test-socket-123', room.id);

    const validToken = generateSessionToken('test-socket-123', 'Alice');

    // Send 5 chat messages
    for (let i = 0; i < 5; i++) {
      eventCallbacks['chat:send']({ text: `Message ${i}`, token: validToken });
    }

    // 6th message should trigger rate limit error
    eventCallbacks['chat:send']({ text: 'Message 6', token: validToken });

    expect(socketMock.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ message: expect.stringContaining('demasiado rápido') })
    );
  });

  it('session middleware blocks unauthorized socket events without valid HMAC token', () => {
    const middleware = useMiddlewares[0];
    const nextMock = vi.fn();

    // Exempt event (e.g. room:create)
    middleware(['room:create', { playerName: 'Bob' }], nextMock);
    expect(nextMock).toHaveBeenCalledWith();

    // Protected event without token
    nextMock.mockClear();
    middleware(['player:move', { direction: 'UP' }], nextMock);
    expect(nextMock).toHaveBeenCalledWith(expect.any(Error));

    // Protected event with valid token
    nextMock.mockClear();
    const validToken = generateSessionToken('test-socket-123', 'Bob');
    middleware(['player:move', { direction: 'UP', token: validToken }], nextMock);
    expect(nextMock).toHaveBeenCalledWith();
  });
});
