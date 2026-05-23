'use client';

import { Suspense, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Environment, CameraShake, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlockGrid } from './BlockGrid';
import { PlayerMesh } from './PlayerMesh';
import { ParticleSystem, spawnParticles } from './ParticleSystem';
import { StageShow } from './StageShow';
import { useGameStore } from '@/src/stores/gameStore';
import { CAMERA_POSITION, CAMERA_FOV, BLOCK_SIZE } from '@/src/lib/constants';
import { GRID_SIZE, Player } from '@/src/shared/types';

// ---------------------------------------------------------------------------
//  Cinematic Camera Handler
//  Supports lobby orbiting, initial sweep, local player tension zoom,
//  and full interactive spectator controls when dead.
// ---------------------------------------------------------------------------
const SPECTATOR_MOUSE_CONFIG = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE
};

function CinematicCamera({ isSpectator }: { isSpectator: boolean }) {
  const { size, camera } = useThree();
  
  // Game state subscriptions
  const phase = useGameStore((s) => s.gameState?.phase || 'LOBBY');

  // Keep track of intro starting sweep animation
  const startingStartTimeRef = useRef(0);
  const isFirstStartingFrameRef = useRef(true);
  const lastFrameTimeRef = useRef(0);
  const startingElapsedRef = useRef(0);

  // Store camera target lookAt using a ref to interpolate smoothly
  const currentLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  
  // Track phase changes to trigger starting sweep
  const prevPhaseRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (phase === 'STARTING') {
      startingStartTimeRef.current = 0;
      isFirstStartingFrameRef.current = true;
      lastFrameTimeRef.current = 0;
      startingElapsedRef.current = 0;

      const isPortrait = typeof window !== 'undefined' ? window.innerWidth < window.innerHeight : false;
      const basePosVec = new THREE.Vector3(
        isPortrait ? 0 : CAMERA_POSITION[0],
        isPortrait ? 18 : CAMERA_POSITION[1],
        isPortrait ? 18 : CAMERA_POSITION[2]
      );
      const baseRadius = Math.sqrt(basePosVec.x * basePosVec.x + basePosVec.z * basePosVec.z);
      const radius = baseRadius * 1.8;
      const y = basePosVec.y * 1.8;

      camera.position.set(0, y, -radius);
      currentLookAtRef.current.set(0, 0, 0);
      camera.lookAt(currentLookAtRef.current);
      camera.updateProjectionMatrix();
    }
  }, [camera, phase]);

  useEffect(() => {
    if (phase === 'STARTING') {
      startingStartTimeRef.current = 0; // Will be initialized on first useFrame tick
      isFirstStartingFrameRef.current = true;
      lastFrameTimeRef.current = 0;
      startingElapsedRef.current = 0;
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  useFrame(({ camera }) => {
    // Spectators are controlled manually by OrbitControls
    if (isSpectator) {
      return;
    }

    const time = performance.now() / 1000;
    const isPortrait = size.width < size.height;
    
    // Default base camera parameters
    const basePosVec = new THREE.Vector3(
      isPortrait ? 0 : CAMERA_POSITION[0],
      isPortrait ? 18 : CAMERA_POSITION[1],
      isPortrait ? 18 : CAMERA_POSITION[2]
    );
    const baseFov = isPortrait ? 70 : CAMERA_FOV;
    const baseLookAtVec = new THREE.Vector3(0, 0, 0);

    const targetCameraPos = basePosVec.clone();
    const targetLookAt = baseLookAtVec.clone();
    const targetFov = baseFov;

    if (phase === 'LOBBY' || phase === 'GAME_OVER') {
      // Gentle floating orbiting view in Lobby to make the 3D scene feel organic
      const orbitSpeed = 0.12;
      const radius = isPortrait ? 22 : 17;
      targetCameraPos.set(
        Math.sin(time * orbitSpeed) * radius,
        14.5 + Math.sin(time * 0.25) * 1.5,
        Math.cos(time * orbitSpeed) * radius
      );
      targetLookAt.set(0, -0.5, 0);
    } else if (phase === 'STARTING') {
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = time;
        startingElapsedRef.current = 0;
      }
      
      const delta = time - lastFrameTimeRef.current;
      lastFrameTimeRef.current = time;
      
      // Cap delta to prevent huge jumps during loading spikes or tab-out freezes
      const cappedDelta = Math.min(delta, 0.05);
      startingElapsedRef.current += cappedDelta;
      
      const duration = 4.0; // 4 seconds duration matching server
      const elapsed = startingElapsedRef.current;
      const t = Math.min(elapsed / duration, 1.0);
      
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic deceleration
      
      const startAngle = Math.PI * 0.5 + Math.PI; // Start 180 degrees offset (behind the arena)
      const targetAngle = Math.PI * 0.5; // End at standard front-side angle
      const angle = THREE.MathUtils.lerp(startAngle, targetAngle, ease);
      
      const baseRadius = Math.sqrt(basePosVec.x * basePosVec.x + basePosVec.z * basePosVec.z);
      const radius = THREE.MathUtils.lerp(baseRadius * 1.8, baseRadius, ease);
      const y = THREE.MathUtils.lerp(basePosVec.y * 1.8, basePosVec.y, ease);
      
      targetCameraPos.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      targetLookAt.set(0, 0, 0);
    }

    // Apply linear interpolation (lerp) for buttery smooth motion
    if (camera instanceof THREE.PerspectiveCamera) {
      if (phase === 'STARTING' && isFirstStartingFrameRef.current) {
        // Instant snap on the very first frame to prevent ugly snapping slides from default mounting position
        camera.position.copy(targetCameraPos);
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
        currentLookAtRef.current.copy(targetLookAt);
        camera.lookAt(currentLookAtRef.current);
        isFirstStartingFrameRef.current = false;
      } else {
        camera.position.lerp(targetCameraPos, 0.065);
        
        if (Math.abs(camera.fov - targetFov) > 0.05) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.065);
          camera.updateProjectionMatrix();
        }
      }
    }

    if (!(phase === 'STARTING' && isFirstStartingFrameRef.current)) {
      currentLookAtRef.current.lerp(targetLookAt, 0.065);
      camera.lookAt(currentLookAtRef.current);
    }
  });

  // SPECTATOR MODE: Active manual camera orbit controls
  if (isSpectator) {
    return (
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.06}
        maxPolarAngle={Math.PI / 2.1} // prevent going underneath floor
        minDistance={6}
        maxDistance={40}
        enableRotate={true}
        enablePan={true}
        enableZoom={true}
        mouseButtons={SPECTATOR_MOUSE_CONFIG}
      />
    );
  }

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
// ---------------------------------------------------------------------------
//  VictoryCelebration — spawns voxel fireworks and dense digital confetti
// ---------------------------------------------------------------------------
function VictoryCelebration({ winnerId, players }: { winnerId: string | null; players: Player[] }) {
  const winner = useMemo(() => players.find((p) => p.id === winnerId), [winnerId, players]);
  const halfGrid = (GRID_SIZE / 2 - 0.5) * BLOCK_SIZE;

  // Track firework and confetti spawn intervals using refs
  const fireworkTimerRef = useRef(0);
  const confettiTimerRef = useRef(0);

  useFrame((state, delta) => {
    if (!winner) return;

    const winnerX = winner.position.x * BLOCK_SIZE - halfGrid;
    const winnerZ = winner.position.z * BLOCK_SIZE - halfGrid;

    // 1. Spawning Voxel Fireworks in the sky above the stage
    fireworkTimerRef.current += delta;
    if (fireworkTimerRef.current > 1.1) {
      fireworkTimerRef.current = 0;

      // Pick a random position above the grid
      const fx = (Math.random() - 0.5) * 13;
      const fz = (Math.random() - 0.5) * 13;
      const fy = 8.5 + Math.random() * 4.5;

      // Select a random vibrant neon color
      const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff0055', '#00ff55', '#af52de'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      // Spawn main quantized voxel art firework burst
      spawnParticles({
        x: fx,
        y: fy,
        z: fz,
        color: randomColor,
        count: 75,
        type: 'voxel_burst'
      });
      
      // Secondary minor burst for extra volume and depth after a 180ms delay
      setTimeout(() => {
        spawnParticles({
          x: fx + (Math.random() - 0.5) * 1.5,
          y: fy + (Math.random() - 0.5) * 1.5,
          z: fz + (Math.random() - 0.5) * 1.5,
          color: winner.color, // themed secondary pop
          count: 35,
          type: 'voxel_burst'
        });
      }, 180);
    }

    // 2. Continuous dense cascade of neon digital confetti around the winner
    confettiTimerRef.current += delta;
    if (confettiTimerRef.current > 0.08) { // spawn every 80ms
      confettiTimerRef.current = 0;

      // Confetti floats down within a radius of 2.2 units of the winner
      const cx = winnerX + (Math.random() - 0.5) * 2.2;
      const cz = winnerZ + (Math.random() - 0.5) * 2.2;
      const cy = 6.8 + Math.random() * 2.5;

      const colors = [winner.color, '#ffffff', '#00f0ff', '#ff00ff', '#ffff00'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      spawnParticles({
        x: cx,
        y: cy,
        z: cz,
        color: color,
        count: 6,
        type: 'confetti'
      });
    }
  });

  return null;
}

//  GameCanvas — main 3D scene wrapper
// ---------------------------------------------------------------------------
export function GameCanvas() {
  const gameState = useGameStore((s) => s.gameState);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const containerRef = useRef<HTMLDivElement>(null);

  // Spectator detection (dead, spectating, or free camera during victory celebration!)
  const isSpectator = useMemo(() => {
    if (!gameState) return false;
    if (gameState.phase === 'GAME_OVER') return true; // Unlock OrbitControls camera for everyone on victory celebration!
    const localPlayer = gameState.players.find((p) => p.id === localPlayerId);
    return gameState.phase !== 'LOBBY' && (!localPlayer || !localPlayer.isAlive);
  }, [gameState, localPlayerId]);

  // Initial camera position matches the starting flight coordinates to bypass default mounting snapshots
  const initialCameraPos = useMemo(() => {
    if (gameState?.phase === 'STARTING') {
      let isPortrait = false;
      if (typeof window !== 'undefined') {
        isPortrait = window.innerWidth < window.innerHeight;
      }
      const basePosVec = new THREE.Vector3(
        isPortrait ? 0 : CAMERA_POSITION[0],
        isPortrait ? 18 : CAMERA_POSITION[1],
        isPortrait ? 18 : CAMERA_POSITION[2]
      );
      const baseRadius = Math.sqrt(basePosVec.x * basePosVec.x + basePosVec.z * basePosVec.z);
      const radius = baseRadius * 1.8;
      const y = basePosVec.y * 1.8;
      return [0, y, -radius] as [number, number, number];
    }
    return CAMERA_POSITION;
  }, [gameState?.phase]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="game-canvas-container"
      style={{ width: '100%', height: '100%' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: initialCameraPos, fov: CAMERA_FOV }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMappingExposure: 1.1 }}
        eventSource={containerRef as unknown as HTMLElement}
        eventPrefix="client"
      >
        <CinematicCamera isSpectator={isSpectator} />
        <Suspense fallback={null}>

          {/* ---- Lighting ---- */}
          {/* Ambient: just enough base illumination to keep players visible in shadow areas */}
          <ambientLight intensity={0.35} />

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

          {/* Dynamic Stage Lighting, Volumetric Spotlights, Neon Lasers, and Beat Flash */}
          <StageShow />

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

              {gameState.phase === 'GAME_OVER' && (
                <VictoryCelebration
                  winnerId={gameState.winnerId}
                  players={gameState.players}
                />
              )}
            </>
          )}

          {/* Environment for material PBR reflections (player meshes) */}
          <Environment preset="night" />

          {/* Global Particle System */}
          <ParticleSystem />

          {/* Camera Shake on elimination and tension buildup — only active for alive players when intensity > 0 */}
          {!isSpectator && gameState?.phase && (gameState.phase === 'ELIMINATING' || gameState.phase === 'ANNOUNCING') && (
            <CameraShake
              maxYaw={0.08}
              maxPitch={0.08}
              maxRoll={0.08}
              yawFrequency={0.4}
              pitchFrequency={0.4}
              rollFrequency={0.4}
              intensity={
                gameState.phase === 'ELIMINATING'
                  ? 1.8 // amplified shake on collapse!
                  : 0.25 // subtle building tension rumble!
              }
            />
          )}

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
