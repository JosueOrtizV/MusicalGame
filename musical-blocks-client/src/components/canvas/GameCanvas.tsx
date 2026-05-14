'use client';

import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Environment, CameraShake } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlockGrid } from './BlockGrid';
import { PlayerMesh } from './PlayerMesh';
import { ParticleSystem } from './ParticleSystem';
import { useGameStore } from '@/src/stores/gameStore';
import { CAMERA_POSITION, CAMERA_FOV } from '@/src/lib/constants';

// ---------------------------------------------------------------------------
//  Responsive Camera Handler
// ---------------------------------------------------------------------------
function ResponsiveCamera() {
  useFrame(({ camera, size }) => {
    const isPortrait = size.width < size.height;

    // Pull camera back and increase FOV for mobile portrait
    const targetPos = isPortrait ? [0, 18, 18] : CAMERA_POSITION;
    const targetFov = isPortrait ? 70 : CAMERA_FOV;

    if (camera instanceof THREE.PerspectiveCamera) {
      // Direct mutation is allowed inside useFrame for performance
      // but we update only when needed to avoid Matrix recalculations
      if (camera.fov !== targetFov) {
        camera.position.set(targetPos[0], targetPos[1], targetPos[2]);
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);
      }
    }
  });

  return null;
}

// ---------------------------------------------------------------------------
//  GameCanvas — main 3D scene wrapper
// ---------------------------------------------------------------------------
export function GameCanvas() {
  const gameState = useGameStore((s) => s.gameState);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="game-canvas-container" style={{ width: '100%', height: '100%' }}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        // ✅ KEY: Isolate events to this container only. 
        // This prevents R3F from stealing events from HUD siblings.
        eventSource={containerRef as unknown as HTMLElement}
        eventPrefix="client"
      >
        <ResponsiveCamera />
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={60}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <pointLight position={[-10, 10, -10]} intensity={0.4} color="#8080ff" />

          {/* Atmosphere */}
          <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />
          <fog attach="fog" args={['#0a0a1a', 50, 150]} />

          {/* Grid platform */}
          {gameState && (
            <>
              {/* No base platform — blocks float in the abyss */}


              {/* Blocks */}
              <BlockGrid
                blocks={gameState.blocks}
                winnerColor={gameState.winnerColor}
                phase={gameState.phase}
              />

              {/* Players */}
              {gameState.players.map((player) => (
                <PlayerMesh
                  key={player.id}
                  player={player}
                  isLocal={player.id === localPlayerId}
                />
              ))}
            </>
          )}

          {/* Environment for reflections */}
          <Environment preset="night" />

          {/* Global Particle System */}
          <ParticleSystem />

          {/* Camera Shake on elimination */}
          <CameraShake
            maxYaw={0.05}
            maxPitch={0.05}
            maxRoll={0.05}
            yawFrequency={0.2}
            pitchFrequency={0.2}
            rollFrequency={0.2}
            intensity={gameState?.phase === 'ELIMINATING' ? 1 : 0}
          />

          {/* Post-Processing */}
          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={1.1} mipmapBlur intensity={1.5} />
            {/* @ts-expect-error Types in postprocessing might conflict with React 19 */}
            <Vignette eskil={false} offset={0.1} darkness={1.2} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
