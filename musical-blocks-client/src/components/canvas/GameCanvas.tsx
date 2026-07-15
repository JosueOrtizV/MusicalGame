'use client';

import { Suspense, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Environment, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlockGrid } from './BlockGrid';
import { PlayerMesh } from './PlayerMesh';
import { ParticleSystem, spawnParticles, clearParticles } from './ParticleSystem';
import { StageShow } from './StageShow';
import { useGameStore } from '@/src/stores/gameStore';
import {
  CAMERA_POSITION,
  CAMERA_FOV,
  BLOCK_SIZE,
  FOLLOW_CAM_FOV,
  FOLLOW_CAM_LERP,
  ORBIT_MIN_POLAR,
  ORBIT_MAX_POLAR,
  ORBIT_MIN_DIST,
  ORBIT_MAX_DIST,
} from '@/src/lib/constants';
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

function CinematicCamera({
  isSpectator,
  containerRef,
  wasAliveThisRound
}: {
  isSpectator: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  wasAliveThisRound: boolean;
}) {
  const { size, camera } = useThree();

  // Game state subscriptions
  const phase = useGameStore((s) => s.gameState?.phase || 'LOBBY');
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const cameraMode = useGameStore((s) => s.cameraMode);

  // Camera orbit state (mouse/touch-controlled)
  const yawRef = useRef(0);               // horizontal rotation around player
  const pitchRef = useRef(Math.PI * 0.3);  // vertical angle
  const distRef = useRef(10);             // distance from player
  const isTouchDraggingRef = useRef(false);
  const lastTouchPosRef = useRef({ x: 0, y: 0 });
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDistanceRef = useRef<number | null>(null);

  // Orbit event handlers — use capture-phase window listeners for touch and pointer lock
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartId: number | null = null;

    // 1. Pointer Lock Event Handlers
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== container) return;
      if (useGameStore.getState().cameraMode === 'static') return;
      yawRef.current -= e.movementX * 0.003;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current - e.movementY * 0.003,
        ORBIT_MIN_POLAR,
        ORBIT_MAX_POLAR
      );
      useGameStore.setState({ cameraYaw: yawRef.current });
    };

    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === container;
      useGameStore.setState({ isPointerLocked: isLocked });
      if (isLocked) {
        document.addEventListener('mousemove', onMouseMove);
      } else {
        document.removeEventListener('mousemove', onMouseMove);
      }
    };

    const onContainerClick = () => {
      const isMobile = window.innerWidth <= 768;
      const currentPhase = useGameStore.getState().gameState?.phase || 'LOBBY';
      const isGameplay = currentPhase === 'DANCING' || currentPhase === 'ANNOUNCING' || currentPhase === 'ELIMINATING' || currentPhase === 'ROUND_END';
      if (useGameStore.getState().cameraMode === 'static') return;
      if (!isMobile && isGameplay && document.pointerLockElement !== container) {
        try {
          const promise = container.requestPointerLock();
          if (promise && typeof promise.catch === 'function') {
            promise.catch((err) => {
              // Ignore abort/security lock request errors caused by rapid clicking/exiting
              console.debug('Pointer lock request deferred or rejected:', err);
            });
          }
        } catch (err) {
          console.debug('Pointer lock request failed:', err);
        }
      }
    };

    // 2. Touch event handlers for mobile
    const onPointerDown = (e: PointerEvent) => {
      if (!container.contains(e.target as Node)) return;

      if (e.pointerType === 'touch') {
        const rect = container.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const relativeY = e.clientY - rect.top;

        // Prevent starting camera rotation on active mobile control zones (bottom-left and bottom-right)
        const inJoystickArea = relativeX < 180 && relativeY > rect.height - 180;
        const inDashArea = relativeX > rect.width - 140 && relativeY > rect.height - 140;

        if (!inJoystickArea && !inDashArea) {
          activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

          if (activeTouchesRef.current.size === 1) {
            isTouchDraggingRef.current = true;
            touchStartId = e.pointerId;
            lastTouchPosRef.current = { x: e.clientX, y: e.clientY };
          } else if (activeTouchesRef.current.size === 2) {
            isTouchDraggingRef.current = false; // Disable single-finger drag rotation when pinching
            const touches = Array.from(activeTouchesRef.current.values());
            const dx = touches[0].x - touches[1].x;
            const dy = touches[0].y - touches[1].y;
            lastPinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        if (activeTouchesRef.current.has(e.pointerId)) {
          activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

          if (activeTouchesRef.current.size === 1 && isTouchDraggingRef.current && e.pointerId === touchStartId) {
            // Only allow rotation if not in static camera mode
            if (useGameStore.getState().cameraMode !== 'static') {
              const dx = e.clientX - lastTouchPosRef.current.x;
              const dy = e.clientY - lastTouchPosRef.current.y;
              lastTouchPosRef.current = { x: e.clientX, y: e.clientY };

              const factor = 0.024;
              yawRef.current -= dx * factor;
              pitchRef.current = THREE.MathUtils.clamp(
                pitchRef.current - dy * factor,
                ORBIT_MIN_POLAR,
                ORBIT_MAX_POLAR
              );
              useGameStore.setState({ cameraYaw: yawRef.current });
            }
          } else if (activeTouchesRef.current.size === 2 && lastPinchDistanceRef.current !== null) {
            const touches = Array.from(activeTouchesRef.current.values());
            const dx = touches[0].x - touches[1].x;
            const dy = touches[0].y - touches[1].y;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);

            const deltaDist = currentDistance - lastPinchDistanceRef.current;
            lastPinchDistanceRef.current = currentDistance;

            // Pinch out (deltaDist > 0) -> camera distance decreases -> zoom in
            // Pinch in (deltaDist < 0) -> camera distance increases -> zoom out
            const zoomFactor = 0.05;
            distRef.current = THREE.MathUtils.clamp(
              distRef.current - deltaDist * zoomFactor,
              ORBIT_MIN_DIST,
              ORBIT_MAX_DIST
            );
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        if (activeTouchesRef.current.has(e.pointerId)) {
          activeTouchesRef.current.delete(e.pointerId);

          if (activeTouchesRef.current.size < 2) {
            lastPinchDistanceRef.current = null;
          }

          if (activeTouchesRef.current.size === 1) {
            // Re-enable rotation with the single remaining touch
            const remainingPointerId = Array.from(activeTouchesRef.current.keys())[0];
            const remainingTouch = activeTouchesRef.current.get(remainingPointerId)!;
            isTouchDraggingRef.current = true;
            touchStartId = remainingPointerId;
            lastTouchPosRef.current = { x: remainingTouch.x, y: remainingTouch.y };
          } else if (activeTouchesRef.current.size === 0) {
            isTouchDraggingRef.current = false;
            touchStartId = null;
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      distRef.current = THREE.MathUtils.clamp(
        distRef.current + e.deltaY * 0.008,
        ORBIT_MIN_DIST,
        ORBIT_MAX_DIST
      );
    };

    // Bind listeners
    document.addEventListener('pointerlockchange', onPointerLockChange);
    container.addEventListener('click', onContainerClick);
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('pointermove', onPointerMove, { capture: true });
    window.addEventListener('pointerup', onPointerUp, { capture: true });
    window.addEventListener('pointercancel', onPointerUp, { capture: true });
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      container.removeEventListener('click', onContainerClick);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('pointermove', onPointerMove, { capture: true });
      window.removeEventListener('pointerup', onPointerUp, { capture: true });
      window.removeEventListener('pointercancel', onPointerUp, { capture: true });
      container.removeEventListener('wheel', onWheel);

      if (document.pointerLockElement === container) {
        document.exitPointerLock();
      }
      useGameStore.setState({ isPointerLocked: false });
    };
  }, [containerRef]);

  // Separate effect to handle exiting pointer lock when transitioning out of gameplay or to static mode
  useEffect(() => {
    const isGameplay = phase === 'DANCING' || phase === 'ANNOUNCING' || phase === 'ELIMINATING' || phase === 'ROUND_END';
    const isStatic = cameraMode === 'static';
    if ((!isGameplay || isStatic) && typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (err) {
        console.debug('Exit pointer lock failed:', err);
      }
      useGameStore.setState({ isPointerLocked: false });
    }
  }, [phase, cameraMode]);

  // Clear lingering victory confetti and fireworks when entering a new game round or returning to lobby
  useEffect(() => {
    if (phase === 'STARTING' || phase === 'LOBBY') {
      clearParticles();
    }
  }, [phase]);

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
    let targetFov = baseFov;

    const isGameplay = phase === 'DANCING' || phase === 'ANNOUNCING' || phase === 'ELIMINATING' || phase === 'ROUND_END';

    if (isGameplay && localPlayerId) {
      const gameState = useGameStore.getState().gameState;
      const localPlayer = gameState?.players.find(p => p.id === localPlayerId);

      const isEliminatingOrRoundEnd = phase === 'ELIMINATING' || phase === 'ROUND_END';
      const shouldFollow = localPlayer && (localPlayer.isAlive || (wasAliveThisRound && isEliminatingOrRoundEnd));

      if (shouldFollow) {
        // Calculate player world position
        const halfGrid = (GRID_SIZE / 2 - 0.5) * BLOCK_SIZE;
        const playerWorldX = localPlayer.position.x * BLOCK_SIZE - halfGrid;
        const playerWorldZ = localPlayer.position.z * BLOCK_SIZE - halfGrid;

        if (cameraMode === 'static') {
          yawRef.current = THREE.MathUtils.lerp(yawRef.current, 0, 0.05);
          pitchRef.current = THREE.MathUtils.lerp(pitchRef.current, Math.PI * 0.3, 0.05);
          useGameStore.setState({ cameraYaw: yawRef.current });
        }

        // Calculate camera position in spherical coordinates relative to the player
        const yaw = yawRef.current;
        const pitch = pitchRef.current;
        const dist = distRef.current;

        const targetCamX = playerWorldX + Math.sin(yaw) * Math.cos(pitch) * dist;
        const targetCamY = Math.sin(pitch) * dist;
        const targetCamZ = playerWorldZ + Math.cos(yaw) * Math.cos(pitch) * dist;

        targetCameraPos.set(targetCamX, targetCamY, targetCamZ);
        targetLookAt.set(playerWorldX, 0.5, playerWorldZ);
        targetFov = FOLLOW_CAM_FOV;
      }
    } else if (phase === 'LOBBY') {
      // Gentle floating orbiting view in Lobby to make the 3D scene feel organic
      const orbitSpeed = 0.12;
      const radius = isPortrait ? 22 : 17;
      targetCameraPos.set(
        Math.sin(time * orbitSpeed) * radius,
        14.5 + Math.sin(time * 0.25) * 1.5,
        Math.cos(time * orbitSpeed) * radius
      );
      targetLookAt.set(0, -0.5, 0);
    } else if (phase === 'GAME_OVER') {
      const gameState = useGameStore.getState().gameState;
      const winner = gameState?.players.find((p) => p.id === gameState?.winnerId);

      if (winner) {
        // Calculate winner world position
        const halfGrid = (GRID_SIZE / 2 - 0.5) * BLOCK_SIZE;
        const winnerWorldX = winner.position.x * BLOCK_SIZE - halfGrid;
        const winnerWorldZ = winner.position.z * BLOCK_SIZE - halfGrid;

        // Position camera south of winner, looking directly at the winner's center
        const camDistZ = 7.5;
        const camDistY = 5.0;

        targetCameraPos.set(winnerWorldX, camDistY, winnerWorldZ + camDistZ);
        targetLookAt.set(winnerWorldX, 0.5, winnerWorldZ);
        targetFov = 60;
      } else {
        // Fixed isometric arena overview when no winner (tie / sudden death wipeout)
        // On mobile (isPortrait), aspect ratio is narrow (< 0.55), so we scale up
        // radius to 35 and height to 28 so the entire 12x12 grid fits in portrait mode.
        const radius = isPortrait ? 35 : 18;
        const height = isPortrait ? 28 : 15;
        targetCameraPos.set(0, height, radius);
        targetLookAt.set(0, -0.5, 0);
        targetFov = isPortrait ? 55 : 55;
      }
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
    const lerpFactor = isGameplay ? FOLLOW_CAM_LERP : 0.065;
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
        camera.position.lerp(targetCameraPos, lerpFactor);

        if (Math.abs(camera.fov - targetFov) > 0.05) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, lerpFactor);
          camera.updateProjectionMatrix();
        }
      }
    }

    // Custom pure camera shake logic (prevents resetting lookAt to arena center during ANNOUNCING/ELIMINATING phases)
    let shakeX = 0;
    let shakeY = 0;
    let shakeZ = 0;
    if (phase === 'ANNOUNCING' || phase === 'ELIMINATING') {
      const timeLeft = useGameStore.getState().gameState?.timeLeft ?? 99;
      const isUrgent = phase === 'ANNOUNCING' && timeLeft <= 3;

      // Fine-tuned, extremely subtle intensities requested by user to achieve a perfect balance
      const intensity = phase === 'ELIMINATING' ? 0.007 : (isUrgent ? 0.004 : 0.001);
      const speed = phase === 'ELIMINATING' ? 18 : 12;
      const tShake = time * speed;

      if (intensity > 0) {
        shakeX = Math.sin(tShake * 1.1) * intensity;
        shakeY = Math.cos(tShake * 1.3) * intensity;
        shakeZ = Math.sin(tShake * 1.7) * intensity;
      }
    }

    if (shakeX !== 0 || shakeY !== 0 || shakeZ !== 0) {
      camera.position.x += shakeX;
      camera.position.y += shakeY;
      camera.position.z += shakeZ;
    }

    if (!(phase === 'STARTING' && isFirstStartingFrameRef.current)) {
      currentLookAtRef.current.lerp(targetLookAt, lerpFactor);

      const finalLookAt = currentLookAtRef.current.clone();
      if (shakeX !== 0 || shakeY !== 0 || shakeZ !== 0) {
        finalLookAt.x += shakeX * 0.5;
        finalLookAt.y += shakeY * 0.5;
        finalLookAt.z += shakeZ * 0.5;
      }
      camera.lookAt(finalLookAt);
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

  useEffect(() => {
    return () => {
      geometry.dispose();
      mat.dispose();
    };
  }, [geometry, mat]);

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

  // Track if the player started this round alive (queried from store)
  const wasAliveThisRound = useGameStore((s) => s.wasAliveThisRound);

  // Spectator detection (dead or spectating during gameplay)
  const isSpectator = useMemo(() => {
    if (!gameState) return false;
    if (gameState.phase === 'GAME_OVER') return false; // Driven by CinematicCamera for victory/tie framing!
    const localPlayer = gameState.players.find((p) => p.id === localPlayerId);

    // During ELIMINATING or ROUND_END, if the player was alive earlier in this round, 
    // keep them in follow-camera mode so they can see their own character fall.
    const isEliminatingOrRoundEnd = gameState.phase === 'ELIMINATING' || gameState.phase === 'ROUND_END';
    const justDied = isEliminatingOrRoundEnd && wasAliveThisRound && (!localPlayer || !localPlayer.isAlive);

    if (justDied) {
      return false;
    }

    return gameState.phase !== 'LOBBY' && (!localPlayer || !localPlayer.isAlive);
  }, [gameState, localPlayerId, wasAliveThisRound]);

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

  return (
    <div
      ref={containerRef}
      className="game-canvas-container"
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: initialCameraPos, fov: CAMERA_FOV }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMappingExposure: 1.1 }}
        eventSource={containerRef as unknown as HTMLElement}
        eventPrefix="client"
      >
        <CinematicCamera
          isSpectator={isSpectator}
          containerRef={containerRef}
          wasAliveThisRound={wasAliveThisRound}
        />
        <Suspense fallback={null}>

          {/* ---- Lighting ---- */}
          {/* Ambient: just enough base illumination to keep players visible in shadow areas */}
          <ambientLight intensity={0.35} />

          {/* Directional: shadows for player meshes */}
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
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
