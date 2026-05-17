'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameBlock, BlockColor, COLOR_HEX, GRID_SIZE, GamePhase } from '@/src/shared/types';
import { BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_GAP, FALL_SPEED } from '@/src/lib/constants';
import { spawnParticles } from './ParticleSystem';

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
  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
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

      let y = block.isActive ? 0 : fallingY.current[i];
      let scale = block.isActive ? 1 : Math.max(0, Math.min(1, (y + 10) / 8));

      if (block.isDead) {
        y = -100;
        scale = 0;
        fallingY.current[i] = -100;
      }

      matrix.makeScale(scale, scale, scale);
      matrix.setPosition(x, y, z);
      mesh.setMatrixAt(i, matrix);

      // InstanceColor: THREE multiplies this with the white material base color.
      // Values > 1.0 → overbright → Bloom effect generates neon halo.
      const shouldGlow = round < 10 && phase === 'ANNOUNCING' && winnerColor && block.color === winnerColor;
      
      const isWinnerReveal = isBlackout && phase === 'ELIMINATING' && winnerColor && block.color === winnerColor;

      if (isBlackout && !isWinnerReveal) {
        // Blind Mode Blackout: Retro-futuristic Pixel Hologram Question Mark
        const isQuestionMarkCell = QUESTION_MARK_MAP[block.row]?.[block.col] === 1;
        if (isQuestionMarkCell) {
          // Beautiful Retro Purple/Magenta glow to match Voxel-Wave lobby
          color.set('#d946ef');
          color.multiplyScalar(1.5); // Intense Synthwave bloom!
        } else {
          // Deep space cyber dark void (extremely dark obsidian violet glass)
          color.set('#0a0418');
        }
      } else {
        color.set(hex);
        if (shouldGlow || isWinnerReveal) {
          color.multiplyScalar(1.6); // Very subtle glow to avoid "exaggerated" feel, or massive glow if winner reveal
        } else {
          color.multiplyScalar(1.0); // Normal: exact block color
        }
      }
      mesh.setColorAt!(i, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [blocks, winnerColor, phase, round, isBlackout]);

  // Animate eliminated blocks falling
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const matrix = new THREE.Matrix4();
    const halfGrid = (GRID_SIZE / 2 - 0.5) * BLOCK_SIZE;
    let needsUpdate = false;

    blocks.flat().forEach((block, i) => {
      if (block.isActive) {
        fallingY.current[i] = 0;
        return;
      }
      if (fallingY.current[i] < -15) return;

      fallingY.current[i] -= delta * FALL_SPEED;

      const x = block.col * BLOCK_SIZE - halfGrid;
      const z = block.row * BLOCK_SIZE - halfGrid;
      const scale = Math.max(0, Math.min(1, (fallingY.current[i] + 10) / 8));

      matrix.makeScale(scale, scale, scale);
      matrix.setPosition(x, fallingY.current[i], z);
      mesh.setMatrixAt(i, matrix);
      needsUpdate = true;
    });

    if (needsUpdate) mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, COUNT]}
      receiveShadow
    />
  );
}
