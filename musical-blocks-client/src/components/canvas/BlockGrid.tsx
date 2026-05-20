'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameBlock, BlockColor, COLOR_HEX, GRID_SIZE, GamePhase } from '@/src/shared/types';
import { BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_GAP, FALL_SPEED } from '@/src/lib/constants';
import { spawnParticles } from './ParticleSystem';
import { useGameStore } from '@/src/stores/gameStore';
import { MUSIC_TRACKS } from '@/src/hooks/useAudio';

interface BlockGridProps {
  blocks: GameBlock[][];
  winnerColor: BlockColor | null;
  phase: GamePhase | null;
  round: number;
  isBlackout: boolean;
}

// Giant Retro Question Mark Pixel Map (12x12)
const QUESTION_MARK_MAP = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 0 (top cap margin)
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0], // row 1: Top horizontal bar
  [0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0], // row 2: Curves curving down
  [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0], // row 3: Right side curve
  [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0], // row 4: Narrows in
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0], // row 5: Directing to center stem
  [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0], // row 6: Center stem top
  [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0], // row 7: Center stem bottom
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 8: Empty gap
  [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0], // row 9: Question dot top
  [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0], // row 10: Question dot bottom
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // row 11 (bottom margin)
];

// ---------------------------------------------------------------------------
//  BlockGrid — 144 blocks rendered as InstancedMesh — Voxel-Wave style
//
//  Material approach:
//    MeshBasicMaterial (color: white) + canvas voxel texture + instanceColor
//    → THREE multiplies: white × instanceColor × texture = block color with border
//    → Colors > 1.0 via multiplyScalar triggers Bloom glow on winning blocks
// ---------------------------------------------------------------------------
export function BlockGrid({ blocks, winnerColor, phase, round, isBlackout }: BlockGridProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = GRID_SIZE * GRID_SIZE; // 144

  const fallingY = useRef<Float32Array>(new Float32Array(COUNT));
  const elimTime = useRef<Float32Array>(new Float32Array(COUNT));

  const settings = useGameStore((s) => s.room?.settings);
  const gameSpeed = settings?.gameSpeed || 'NORMAL';
  const roomId = useGameStore((s) => s.room?.id) || 'DEFAULT';

  // Block geometry — slightly smaller than cell to leave visible gap
  const geometry = useMemo(
    () => new THREE.BoxGeometry(BLOCK_SIZE - BLOCK_GAP, BLOCK_HEIGHT, BLOCK_SIZE - BLOCK_GAP),
    [],
  );

  // Canvas texture: white face with dark gradient border edges
  // The border makes each block visually distinct (voxel look).
  // Since instanceColor tints white → block color, the border tints darker automatically.
  const voxelTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const size = 128;
    const border = 12;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // White face base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Bright top-left highlight (simulates top-light)
    const hlGrad = ctx.createLinearGradient(0, 0, size * 0.4, size * 0.4);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.fillRect(0, 0, size, size);

    // Dark shadow edges (creates depth between adjacent blocks)
    const edgeColor = 'rgba(0,0,0,0.45)';

    // Left edge
    const gL = ctx.createLinearGradient(0, 0, border, 0);
    gL.addColorStop(0, edgeColor); gL.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gL; ctx.fillRect(0, 0, border, size);

    // Right edge
    const gR = ctx.createLinearGradient(size, 0, size - border, 0);
    gR.addColorStop(0, edgeColor); gR.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gR; ctx.fillRect(size - border, 0, border, size);

    // Top edge
    const gT = ctx.createLinearGradient(0, 0, 0, border);
    gT.addColorStop(0, edgeColor); gT.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gT; ctx.fillRect(0, 0, size, border);

    // Bottom edge (darker = more depth)
    const gB = ctx.createLinearGradient(0, size, 0, size - border);
    gB.addColorStop(0, 'rgba(0,0,0,0.65)'); gB.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gB; ctx.fillRect(0, size - border, size, border);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, []);

  // MeshBasicMaterial: ignores scene lighting → always shows pure block color.
  // White base × instanceColor (set via setColorAt) = the block's actual color.
  // The voxelTexture adds bevel/border depth.
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: voxelTexture ?? undefined,
      }),
    [voxelTexture],
  );

  // Dispose on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Update instance matrices and colors when blocks change
  // Handle state updates from the server: reset heights and spawn elimination particles
  useEffect(() => {
    if (!meshRef.current) return;
    const halfGrid = (GRID_SIZE / 2 - 0.5) * BLOCK_SIZE;

    blocks.flat().forEach((block, i) => {
      const x = block.col * BLOCK_SIZE - halfGrid;
      const z = block.row * BLOCK_SIZE - halfGrid;
      const hex = COLOR_HEX[block.color];

      // On elimination: spawn neon burst particles
      if (!block.isActive && !block.isDead && fallingY.current[i] === 0) {
        elimTime.current[i] = Date.now();
        spawnParticles({ x, y: 0, z, color: hex, count: 18, type: 'burst' });
      }
      if (block.isActive) {
        fallingY.current[i] = 0;
        elimTime.current[i] = 0;
      }
      if (block.isDead) {
        fallingY.current[i] = -100;
      }
    });
  }, [blocks]);

  // Audio-reactive arena loop inside the render loop
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const halfGrid = (GRID_SIZE / 2 - 0.5) * BLOCK_SIZE;

    // 1. Calculate active BPM & exponential beatPulse sync
    let activeBpm = 0;
    let seekTime = state.clock.elapsedTime;
    let isPlaying = false;

    if (typeof window !== 'undefined' && MUSIC_TRACKS) {
      if (MUSIC_TRACKS.lobby && MUSIC_TRACKS.lobby.playing()) {
        activeBpm = 110;
        const seek = MUSIC_TRACKS.lobby.seek();
        seekTime = typeof seek === 'number' ? seek : state.clock.elapsedTime;
        isPlaying = true;
      } else if (MUSIC_TRACKS.dance) {
        const BPM_DANCE = [128, 135, 142];
        for (let i = 0; i < MUSIC_TRACKS.dance.length; i++) {
          const track = MUSIC_TRACKS.dance[i];
          if (track && track.playing()) {
            activeBpm = BPM_DANCE[i];
            const seek = track.seek();
            seekTime = typeof seek === 'number' ? seek : state.clock.elapsedTime;
            isPlaying = true;
            break;
          }
        }
      }
    }

    const isLobby = phase === 'LOBBY';
    const isPlayingGame = phase === 'DANCING' || phase === 'ANNOUNCING';

    if (!isPlaying) {
      if (isLobby) {
        activeBpm = 110;
      } else if (isPlayingGame) {
        let trackIndex = 0;
        if (gameSpeed === 'TURBO') {
          trackIndex = (roomId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 2) + 1;
        } else {
          trackIndex = roomId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 3;
        }
        const BPM_DANCE = [128, 135, 142];
        activeBpm = BPM_DANCE[trackIndex];
      } else {
        activeBpm = 120;
      }
      seekTime = state.clock.elapsedTime;
    }

    let beatPulse = 0;
    if (activeBpm > 0) {
      const elapsedBeats = seekTime * (activeBpm / 60);
      const beatProgress = elapsedBeats % 1;
      beatPulse = Math.pow(1 - beatProgress, 4); // exponential decay pulse
    }

    // 2. Loop through all 144 blocks to update matrices and colors instantly
    blocks.flat().forEach((block, i) => {
      const x = block.col * BLOCK_SIZE - halfGrid;
      const z = block.row * BLOCK_SIZE - halfGrid;
      const hex = COLOR_HEX[block.color];

      let y = 0;
      let scale = 1.0;

      if (block.isActive) {
        // A. Handle active block states (idle, announcing, blackout question marks)
        const isWinner = phase === 'ANNOUNCING' && winnerColor && block.color === winnerColor;
        const isWinnerReveal = isBlackout && phase === 'ELIMINATING' && winnerColor && block.color === winnerColor;

        // B. Determine if bobbing/breathing is enabled
        // Disabled in Blind Mode (isBlackout) and Sudden Death (NORMAL round >= 10, CHAOS round >= 1)
        const suddenDeathMode = settings?.suddenDeathMode || 'NORMAL';
        const isSuddenDeath = suddenDeathMode === 'CHAOS' || (suddenDeathMode === 'NORMAL' && round >= 10);
        const enableBobbing = !isBlackout && !isSuddenDeath;

        // C. Handle ANNOUNCING phase tremor & blackout logic
        if (phase === 'ANNOUNCING') {
          const timeLeft = useGameStore.getState().gameState?.timeLeft ?? 0;
          const isLastSecond = timeLeft <= 1;

          if (isBlackout) {
            // In Blind Mode, ALL blocks shake to keep the winner completely hidden, BUT only in the last second!
            if (isLastSecond) {
              const time = state.clock.elapsedTime;
              const shakeSpeed = 55; // rapid visual tremor
              const shakeAmt = 0.012; // sub-voxel scale vibration

              const shakeX = Math.sin(time * shakeSpeed + i * 3) * shakeAmt;
              const shakeZ = Math.cos(time * shakeSpeed + i * 2) * shakeAmt;

              matrix.makeScale(1.0, 1.0, 1.0);
              matrix.setPosition(x + shakeX, 0, z + shakeZ);
            } else {
              matrix.makeScale(1.0, 1.0, 1.0);
              matrix.setPosition(x, 0, z);
            }
            mesh.setMatrixAt(i, matrix);

            const isQuestionMarkCell = QUESTION_MARK_MAP[block.row]?.[block.col] === 1;
            if (isQuestionMarkCell) {
              color.set('#d946ef');
              color.multiplyScalar(1.2 + beatPulse * 0.8);
            } else {
              color.set('#070212'); // obsidian void
            }
            mesh.setColorAt(i, color);
            return;
          } else {
            // Normal mode
            if (isWinner) {
              // The winning block bobs/breathes if enabled, and does not shake
              if (enableBobbing) {
                y = beatPulse * 0.14;
                scale = 1.0 + beatPulse * 0.025;
              }
            } else {
              // Incorrect blocks shake, BUT only in the last second!
              if (isLastSecond) {
                const time = state.clock.elapsedTime;
                const shakeSpeed = 55;
                const shakeAmt = 0.012;

                const shakeX = Math.sin(time * shakeSpeed + i * 3) * shakeAmt;
                const shakeZ = Math.cos(time * shakeSpeed + i * 2) * shakeAmt;

                matrix.makeScale(1.0, 1.0, 1.0);
                matrix.setPosition(x + shakeX, 0, z + shakeZ);
              } else {
                matrix.makeScale(1.0, 1.0, 1.0);
                matrix.setPosition(x, 0, z);
              }
              mesh.setMatrixAt(i, matrix);

              color.set(hex);
              color.multiplyScalar(0.75); // Darken incorrect blocks slightly
              mesh.setColorAt(i, color);
              return;
            }
          }
        } else {
          // Other phases (LOBBY, DANCING, ELIMINATING, etc.)
          if (isWinnerReveal && enableBobbing) {
            y = beatPulse * 0.14;
            scale = 1.0 + beatPulse * 0.025;
          }
        }

        // Apply scale and position for non-shaking states (like winner block or other phases)
        matrix.makeScale(scale, scale, scale);
        matrix.setPosition(x, y, z);
        mesh.setMatrixAt(i, matrix);

        // Color application for non-shaking/default states
        if (isBlackout && !isWinnerReveal) {
          const isQuestionMarkCell = QUESTION_MARK_MAP[block.row]?.[block.col] === 1;
          if (isQuestionMarkCell) {
            // Neon magenta question mark pixels breathing their glow intensely
            color.set('#d946ef');
            color.multiplyScalar(1.2 + beatPulse * 0.8);
          } else {
            color.set('#070212'); // obsidian void
          }
        } else {
          color.set(hex);
          if (isWinner || isWinnerReveal) {
            // Pulse glow intensely on the beat to help guide players!
            // BUT if bobbing is disabled, keep a steady solid glow (no pulsing/blinking)
            if (enableBobbing) {
              color.multiplyScalar(1.2 + beatPulse * 1.0);
            } else {
              color.multiplyScalar(1.2); // steady solid glow
            }
          } else {
            color.multiplyScalar(1.0);
          }
        }
        mesh.setColorAt(i, color);

      } else {
        // B. Handle falling inactive blocks
        if (fallingY.current[i] < -15) {
          // Deep in void: hide to save vertex transforms
          matrix.makeScale(0, 0, 0);
          matrix.setPosition(x, -100, z);
          mesh.setMatrixAt(i, matrix);
          return;
        }

        fallingY.current[i] -= delta * FALL_SPEED;
        y = fallingY.current[i];
        scale = Math.max(0, Math.min(1, (fallingY.current[i] + 10) / 8));

        matrix.makeScale(scale, scale, scale);
        matrix.setPosition(x, y, z);
        mesh.setMatrixAt(i, matrix);

        color.set(hex);
        // Dim the falling blocks gradually
        const fade = Math.max(0.2, Math.min(1.0, (fallingY.current[i] + 10) / 10));
        color.multiplyScalar(fade);
        mesh.setColorAt(i, color);
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, COUNT]}
      receiveShadow
    />
  );
}
