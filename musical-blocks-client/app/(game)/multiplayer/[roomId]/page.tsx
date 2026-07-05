'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { usePlayerInput } from '@/src/hooks/usePlayerInput';
import { useGameStore } from '@/src/stores/gameStore';
import { getSocket } from '@/src/lib/socketClient';
import { RoomLobby } from '@/src/components/ui/RoomLobby';
import { GameHUD } from '@/src/components/hud/GameHUD';
import { GameOverScreen, WinnerScreen } from '@/src/components/ui/EndScreens';
import { Room } from '@/src/shared/types';

const GameCanvas = dynamic(
  () => import('@/src/components/canvas/GameCanvas')
    .then((m) => m.GameCanvas)
    .catch((err) => {
      if (err.name === 'ChunkLoadError' || /chunk/i.test(err.message) || /loading/i.test(err.message)) {
        if (typeof window !== 'undefined') window.location.reload();
      }
      throw err;
    }),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', minHeight: '100vh', background: 'var(--c-bg)',
        fontFamily: 'var(--font-retro)', color: 'var(--c-accent)',
        fontSize: '0.9rem', textShadow: 'var(--glow-purple)'
      }}>
        LOADING 3D ENGINE...
      </div>
    )
  },
);

export default function MultiplayerRoomPage() {
  usePlayerInput();

  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const screen = useGameStore((s) => s.screen);
  const room = useGameStore((s) => s.room);
  const localPlayerName = useGameStore((s) => s.localPlayerName);
  const isConnected = useGameStore((s) => s.isConnected);
  const connectionError = useGameStore((s) => s.connectionError);

  const [isHydrated, setIsHydrated] = useState(() => useGameStore.persist.hasHydrated());
  const hasAttemptedJoinRef = useRef(false);

  useEffect(() => {
    if (!isHydrated) {
      const unsub = useGameStore.persist.onFinishHydration(() => setIsHydrated(true));
      return unsub;
    }
  }, [isHydrated]);

  // Auto-join room when socket connects and store is hydrated
  useEffect(() => {
    if (!isHydrated || !isConnected || !roomId) return;
    // Already in this room
    if (room && room.id.toUpperCase() === roomId.toUpperCase()) {
      hasAttemptedJoinRef.current = true;
      return;
    }

    const socket = getSocket();
    const playerName = localPlayerName || 'Player';
    socket.emit(
      'room:join_private',
      { playerName, code: roomId.toUpperCase() },
      (joinedRoom: Room | null, err?: string) => {
        hasAttemptedJoinRef.current = true;
        if (!joinedRoom || err) {
          useGameStore.getState().setConnectionError(err || 'Room not found');
          return;
        }
        // Set local player first so s.localPlayerId matches inside setRoom's checks
        useGameStore.getState().setLocalPlayer(socket.id!, playerName);
        useGameStore.getState().setRoom(joinedRoom);
      }
    );
  }, [roomId, isConnected, room, localPlayerName, isHydrated]);

  // Navigate back to lobby browser if room becomes null and screen resets to home (after attempting join)
  useEffect(() => {
    if (!isHydrated || !hasAttemptedJoinRef.current) return;
    if (!room && screen === 'home' && !connectionError) {
      router.push('/multiplayer');
    }
  }, [room, screen, connectionError, router, isHydrated]);

  // Error state display
  if (connectionError) {
    return (
      <div className="lobby-bg">
        <div className="lobby-particles" aria-hidden="true" />
        <div className="lobby-card">
          <span className="hud-corner top-left" aria-hidden="true"></span>
          <span className="hud-corner top-right" aria-hidden="true"></span>
          <span className="hud-corner bottom-left" aria-hidden="true"></span>
          <span className="hud-corner bottom-right" aria-hidden="true"></span>
          <div className="hud-scanlines" aria-hidden="true"></div>
          <div className="lobby-logo" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h2 className="logo-title" style={{ color: '#ef4444' }}>Error</h2>
            <p className="logo-sub" style={{ color: '#ff6b6b', marginBottom: '1.5rem', textAlign: 'center' }}>
              {connectionError}
            </p>
            <button
              className="lobby-btn lobby-btn--secondary"
              onClick={() => {
                useGameStore.getState().setConnectionError(null);
                router.push('/multiplayer');
              }}
            >
              Back to Multiplayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connecting / Joining state
  if (screen === 'home' && !room) {
    return (
      <div className="lobby-bg">
        <div className="lobby-particles" aria-hidden="true" />
        <div className="lobby-card">
          <span className="hud-corner top-left" aria-hidden="true"></span>
          <span className="hud-corner top-right" aria-hidden="true"></span>
          <span className="hud-corner bottom-left" aria-hidden="true"></span>
          <span className="hud-corner bottom-right" aria-hidden="true"></span>
          <div className="hud-scanlines" aria-hidden="true"></div>
          <div className="lobby-logo" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h2 className="logo-title">Connecting...</h2>
            <p className="logo-sub">Joining room {roomId?.toUpperCase()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {screen === 'lobby' && <RoomLobby />}

      {(screen === 'game' || screen === 'dead' || screen === 'winner') && (
        <div className="game-screen" aria-label="3D game arena">
          <GameCanvas />
          <GameHUD />
          {screen === 'dead' && <GameOverScreen />}
          {screen === 'winner' && <WinnerScreen />}
        </div>
      )}
    </>
  );
}
