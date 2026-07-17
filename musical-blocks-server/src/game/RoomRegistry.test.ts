import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RoomRegistry } from './RoomRegistry';
import { Server as SocketServer } from 'socket.io';

describe('RoomRegistry', () => {
  let ioMock: any;
  let registry: RoomRegistry;

  beforeEach(() => {
    vi.useFakeTimers();
    ioMock = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as unknown as SocketServer;
    
    registry = new RoomRegistry(ioMock);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and retrieves a new room', () => {
    const room = registry.create('host-1', 'HostPlayer', 'public');
    expect(room).toBeDefined();
    expect(room.id).toBeDefined();
    expect(registry.getByCode(room.id)).toBe(room);
  });

  it('manages player to room mappings', () => {
    const room = registry.create('host-1', 'HostPlayer', 'public');
    registry.setPlayerRoom('host-1', room.id);

    expect(registry.getRoomBySocketId('host-1')).toBe(room);

    registry.removePlayerRoom('host-1');
    expect(registry.getRoomBySocketId('host-1')).toBeUndefined();
  });

  it('finds an available public room', () => {
    expect(registry.findAvailablePublicRoom()).toBeNull();

    const room = registry.create('host-1', 'HostPlayer', 'public');
    // Public room with 1 player (host) in 'waiting' state should be found
    const found = registry.findAvailablePublicRoom();
    expect(found).toBe(room);
  });

  it('validates private room joins', () => {
    const resEmpty = registry.joinPrivate('NONEXISTENT');
    expect(resEmpty.room).toBeNull();
    expect(resEmpty.error).toContain('not found');

    const room = registry.create('host-1', 'HostPlayer', 'private');
    const resSuccess = registry.joinPrivate(room.id);
    expect(resSuccess.room).toBe(room);
    expect(resSuccess.error).toBeUndefined();
  });

  it('filters public rooms for getPublicList', () => {
    registry.create('host-1', 'HostPlayer', 'public');
    registry.create('host-2', 'HostTwo', 'private');

    const publicList = registry.getPublicList();
    expect(publicList.length).toBe(1);
    expect(publicList[0].visibility).toBe('public');
  });

  it('schedules cleanup for empty rooms', () => {
    const room = registry.create('host-1', 'HostPlayer', 'public');
    room.removePlayer('host-1'); // room is now empty

    registry.scheduleCleanup(room.id);
    expect(registry.getByCode(room.id)).toBeDefined();

    vi.advanceTimersByTime(5000);
    expect(registry.getByCode(room.id)).toBeUndefined();
  });

  it('removes empty rooms with removeIfEmpty', () => {
    const room = registry.create('host-1', 'HostPlayer', 'public');
    room.removePlayer('host-1');

    registry.removeIfEmpty(room.id);
    expect(registry.getByCode(room.id)).toBeUndefined();
  });
});
