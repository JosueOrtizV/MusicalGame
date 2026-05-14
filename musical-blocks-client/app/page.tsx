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
  () => import('@/src/components/canvas/GameCanvas').then((m) => m.GameCanvas),
  { ssr: false },
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
