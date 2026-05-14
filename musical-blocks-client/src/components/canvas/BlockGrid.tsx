'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameBlock, BlockColor, COLOR_HEX, GRID_SIZE } from '@/src/shared/types';
import { BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_GAP, FALL_SPEED } from '@/src/lib/constants';
import { spawnParticles } from './ParticleSystem';

interface BlockGridProps {
  blocks: GameBlock[][];
  winnerColor: BlockColor | null;
  phase: string | null;
}

// ---------------------------------------------------------------------------
//  BlockGrid — 144 blocks rendered as ONE draw call via InstancedMesh
// ---------------------------------------------------------------------------
export function BlockGrid({ blocks, winnerColor, phase }: BlockGridProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = GRID_SIZE * GRID_SIZE; // 144

  // Falling blocks: store Y offset per instance
  const fallingY = useRef<Float32Array>(new Float32Array(COUNT));
  const elimTime = useRef<Float32Array>(new Float32Array(COUNT)); // timestamp of elimination

  // Shared geometry & material — only ONE allocation
  const geometry = useMemo(
    () => new THREE.BoxGeometry(BLOCK_SIZE - BLOCK_GAP, BLOCK_HEIGHT, BLOCK_SIZE - BLOCK_GAP),
    [],
  );

  // Procedural voxel border texture
  const voxelTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff'; // Base white to multiply with instanceColor
    ctx.fillRect(0, 0, 128, 128);
    // Dark inner border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }, []);

  const material = useMemo(
    () => new THREE.MeshLambertMaterial({
      map: voxelTexture,
      color: '#ffffff'
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

      // On elimination: record time so useFrame can animate the fall
      if (!block.isActive && !block.isDead && fallingY.current[i] === 0) {
        elimTime.current[i] = Date.now();
        // Spawn burst particles!
        spawnParticles({
          x, y: 0, z,
          color: hex,
          count: 15,
          type: 'burst'
        });
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

      // Color: winning blocks pulse (slightly brighter), others normal
      color.set(hex);
      if (phase === 'ANNOUNCING' && winnerColor && block.color === winnerColor) {
        color.multiplyScalar(1.5); // brighten winning color
      }
      mesh.setColorAt!(i, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [blocks, winnerColor, phase]);

  // Animate eliminated blocks falling
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const matrix = new THREE.Matrix4();
    const halfGrid = (GRID_SIZE / 2 - 0.5) * BLOCK_SIZE;
    let needsUpdate = false;

    blocks.flat().forEach((block, i) => {
      // If block is active, reset its falling Y and keep scale 1
      if (block.isActive) {
        fallingY.current[i] = 0;
        return;
      }

      // If already fallen deep enough, skip to avoid unnecessary matrix updates
      if (fallingY.current[i] < -15) return;

      // Update falling position
      fallingY.current[i] -= delta * FALL_SPEED;

      const x = block.col * BLOCK_SIZE - halfGrid;
      const z = block.row * BLOCK_SIZE - halfGrid;

      // Calculate scale (shrink as it falls)
      // Starts shrinking after y = -2, reaches 0 at y = -10
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
      castShadow
    />
  );
}
