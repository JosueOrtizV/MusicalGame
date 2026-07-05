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

export default function SinglePlayerPage() {
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
