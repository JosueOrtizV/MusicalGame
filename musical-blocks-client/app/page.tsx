'use client';

import dynamic from 'next/dynamic';
import { useSocket } from '@/src/hooks/useSocket';
import { usePlayerInput } from '@/src/hooks/usePlayerInput';
import { useGameStore } from '@/src/stores/gameStore';
import { useGameAudio } from '@/src/hooks/useAudio';
import { LobbyScreen } from '@/src/components/ui/LobbyScreen';
import { RoomLobby } from '@/src/components/ui/RoomLobby';
import { GameHUD } from '@/src/components/hud/GameHUD';
import { GameOverScreen, WinnerScreen } from '@/src/components/ui/EndScreens';
import { SettingsMenu } from '@/src/components/ui/SettingsMenu';

// GameCanvas must be dynamic (no SSR) — Three.js requires browser APIs
const GameCanvas = dynamic(
  () => import('@/src/components/canvas/GameCanvas')
    .then((m) => m.GameCanvas)
    .catch((err) => {
      // If a chunk loading error occurs (common when server restarts or updates chunk hashes),
      // reload the page to fetch the latest manifest and avoid a crash screen.
      if (err.name === 'ChunkLoadError' || /chunk/i.test(err.message) || /loading/i.test(err.message)) {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
      throw err;
    }),
  { 
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--c-bg)',
        fontFamily: 'var(--font-retro)',
        color: 'var(--c-accent)',
        fontSize: '0.9rem',
        textShadow: 'var(--glow-purple)'
      }}>
        LOADING 3D ENGINE...
      </div>
    )
  },
);


// ---------------------------------------------------------------------------
//  Page — root router based on game screen state
// ---------------------------------------------------------------------------
export default function Home() {
  // Initialize socket connection and bind all events
  useSocket();
  // Bind keyboard input (no-op outside DANCING phase)
  usePlayerInput();
  // Initialize global audio manager
  useGameAudio();

  const screen = useGameStore((s) => s.screen);

  return (
    <>
      <SettingsMenu />
      {/* ---- Lobby: home / name entry ------------------------------------ */}
      {screen === 'home' && <LobbyScreen />}

      {/* ---- Room lobby: waiting for players / host start --------------- */}
      {screen === 'lobby' && <RoomLobby />}

      {/* ---- Game: 3D canvas always mounted when in-game ---------------- */}
      {(screen === 'game' || screen === 'dead' || screen === 'winner') && (
        <div className="game-screen">
          <GameCanvas />
          <GameHUD />
          {screen === 'dead'   && <GameOverScreen />}
          {screen === 'winner' && <WinnerScreen />}
        </div>
      )}
    </>
  );
}
