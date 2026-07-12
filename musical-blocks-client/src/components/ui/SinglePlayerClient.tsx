'use client';

import dynamic from 'next/dynamic';
import { usePlayerInput } from '@/src/hooks/usePlayerInput';
import { useSinglePlayerGame } from '@/src/hooks/useSinglePlayerGame';
import { useGameStore } from '@/src/stores/gameStore';
import { GameHUD } from '@/src/components/hud/GameHUD';
import { WinnerScreen } from '@/src/components/ui/EndScreens';
import { SinglePlayerConfig } from '@/src/components/ui/SinglePlayerConfig';

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
      <div 
        role="progressbar"
        aria-label="Loading 3D game engine"
        style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'center', minHeight: '100vh', background: 'var(--c-bg)',
          fontFamily: 'var(--font-retro)', color: 'var(--c-accent)',
          fontSize: '0.9rem', textShadow: 'var(--glow-purple)'
        }}
      >
        <div style={{ width: 40, height: 40, border: '3px solid var(--c-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 16 }}>LOADING 3D ENGINE...</p>
      </div>
    )
  },
);

export function SinglePlayerClient() {
  usePlayerInput();
  useSinglePlayerGame();

  const screen = useGameStore((s) => s.screen);

  return (
    <>
      {screen === 'home' && <SinglePlayerConfig />}

      {(screen === 'game' || screen === 'dead' || screen === 'winner') && (
        <div className="game-screen" aria-label="3D game arena">
          <GameCanvas />
          <GameHUD />
          {screen === 'winner' && <WinnerScreen />}
        </div>
      )}
    </>
  );
}
