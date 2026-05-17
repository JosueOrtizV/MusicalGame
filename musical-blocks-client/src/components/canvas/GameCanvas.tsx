'use client';

import { Suspense, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Environment, CameraShake } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlockGrid } from './BlockGrid';
import { PlayerMesh } from './PlayerMesh';
import { ParticleSystem } from './ParticleSystem';
import { useGameStore } from '@/src/stores/gameStore';
import { CAMERA_POSITION, CAMERA_FOV, BLOCK_SIZE } from '@/src/lib/constants';
import { GRID_SIZE } from '@/src/shared/types';

// ---------------------------------------------------------------------------
//  Responsive Camera Handler
// ---------------------------------------------------------------------------
function ResponsiveCamera() {
  useFrame(({ camera, size }) => {
    const isPortrait = size.width < size.height;
    const targetPos = isPortrait ? [0, 18, 18] : CAMERA_POSITION;
    const targetFov = isPortrait ? 70 : CAMERA_FOV;

    if (camera instanceof THREE.PerspectiveCamera) {
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
// ---------------------------------------------------------------------------
//  NeonGrid — single atmospheric magenta grid at Y=-2.0.
//  Uses vertex colors for radial fade: lines near center are visible,
//  lines toward edges fade to black, creating the "floating in void" feel.
// ---------------------------------------------------------------------------
const GRID_TOTAL_SIZE = GRID_SIZE * BLOCK_SIZE * 2.8; // extends well beyond arena
const GRID_DIVISIONS = 28;
const GRID_Y = -2.0;

function NeonGrid() {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts: number[] = [];
    const colors: number[] = [];

    const half = GRID_TOTAL_SIZE / 2;
    const step = GRID_TOTAL_SIZE / GRID_DIVISIONS;
    // Magenta base (r, g, b)
    const mr = 0.6, mg = 0.0, mb = 0.9;

    // Each line segment has two vertices. For radial fade, we fade each
    // vertex independently based on its 2D distance from the world origin.
    const addVert = (x: number, z: number) => {
      verts.push(x, GRID_Y, z);
      const d = Math.sqrt(x * x + z * z);
      // Quadratic fade: center is brightest, corners approach 0
      const fade = Math.pow(Math.max(0, 1.0 - d / (half * 1.1)), 2);
      colors.push(mr * fade, mg * fade, mb * fade);
    };

    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const pos = -half + i * step;
      // Lines along Z (vary x = pos, sweep z)
      addVert(-half, pos); addVert(half, pos);
      // Lines along X (vary z = pos, sweep x)
      addVert(pos, -half); addVert(pos, half);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, []);


  const mat = useMemo(() => new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.08, // globally subtle; vertex colors do the radial work
  }), []);

  return <lineSegments geometry={geometry} material={mat} />;
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
        gl={{ antialias: true, powerPreference: 'high-performance', toneMappingExposure: 1.1 }}
        eventSource={containerRef as unknown as HTMLElement}
        eventPrefix="client"
      >
        <ResponsiveCamera />
        <Suspense fallback={null}>

          {/* ---- Lighting ---- */}
          {/* Ambient: just enough to see player models */}
          <ambientLight intensity={0.5} />

          {/* Directional: shadows for player meshes */}
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

          {/* Neon accent point lights — affect player meshes, give atmosphere */}
          <pointLight position={[-10, 6, 10]} intensity={1.8} color="#00f0ff" distance={40} decay={2} />
          <pointLight position={[10, 6, -10]} intensity={1.5} color="#ff00ff" distance={40} decay={2} />

          {/* ---- Atmosphere ---- */}
          <Stars radius={100} depth={50} count={5000} factor={4} fade speed={0.8} />
          <fog attach="fog" args={['#0a0a1a', 50, 150]} />

          {/* ---- Neon grid floor ---- */}
          <NeonGrid />

          {/* ---- Game elements ---- */}
          {gameState && (
            <>
              <BlockGrid
                blocks={gameState.blocks}
                winnerColor={gameState.winnerColor}
                phase={gameState.phase}
                round={gameState.round}
                isBlackout={gameState.isBlackout}
              />

              {gameState.players.map((player) => (
                <PlayerMesh
                  key={player.id}
                  player={player}
                  isLocal={player.id === localPlayerId}
                />
              ))}
            </>
          )}

          {/* Environment for material PBR reflections (player meshes) */}
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
          <EffectComposer>
            {/* Bloom: threshold 0.95 — only overbright colors glow (winner blocks, particles) */}
            <Bloom luminanceThreshold={0.95} luminanceSmoothing={0.4} mipmapBlur intensity={1.6} radius={0.55} />
            <Vignette eskil={false} offset={0.15} darkness={1.2} />
          </EffectComposer>

        </Suspense>
      </Canvas>
    </div>
  );
}
