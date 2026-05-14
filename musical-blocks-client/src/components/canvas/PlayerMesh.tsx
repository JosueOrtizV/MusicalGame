'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Player } from '@/src/shared/types';
import { BLOCK_SIZE } from '@/src/lib/constants';
import { LERP_SPEED } from '@/src/lib/constants';
import { spawnParticles } from './ParticleSystem';

interface PlayerMeshProps {
  player: Player;
  isLocal: boolean;
}

const HEAD_SIZE = 0.42;
const BODY_W = 0.32;
const BODY_H = 0.55;
const PLAYER_Y_OFFSET = 0.45; // sits on top of block

// ---------------------------------------------------------------------------
//  PlayerMesh — voxel character per player, interpolated position
// ---------------------------------------------------------------------------
export function PlayerMesh({ player, isLocal }: PlayerMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const deathTimer = useRef(0);

  const halfGrid = (12 / 2 - 0.5) * BLOCK_SIZE;

  // Target world position from grid coords
  const targetX = player.position.x * BLOCK_SIZE - halfGrid;
  const targetZ = player.position.z * BLOCK_SIZE - halfGrid;

  // Death animation state
  const wasAlive = useRef(player.isAlive);
  const isDead = !player.isAlive;

  // Trigger death particles once
  useEffect(() => {
    if (wasAlive.current && isDead) {
      spawnParticles({
        x: targetX,
        y: PLAYER_Y_OFFSET,
        z: targetZ,
        color: '#aaaaaa', // Dust color
        count: 20,
        type: 'dust'
      });
      wasAlive.current = false;
    }
  }, [isDead, targetX, targetZ]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const g = groupRef.current;

    if (isDead) {
      // Death animation: fall + shrink
      deathTimer.current += delta;
      g.position.y -= delta * 4;
      const s = Math.max(0, 1 - deathTimer.current * 3);
      g.scale.setScalar(s);

      // Hide once finished
      if (deathTimer.current > 0.5) g.visible = false;
      return;
    }

    g.visible = true;

    // Smooth interpolation to server position (client-side lerp)
    const lerpFactor = 1 - Math.pow(0.001, delta * LERP_SPEED);
    g.position.x += (targetX - g.position.x) * lerpFactor;
    g.position.z += (targetZ - g.position.z) * lerpFactor;
    g.position.y = PLAYER_Y_OFFSET;
  });

  // No reading refs during render! Visibility is handled in useFrame

  const playerColor = new THREE.Color(player.color);
  const darkerColor = playerColor.clone().multiplyScalar(0.6);

  return (
    <group
      ref={groupRef}
      position={[targetX, PLAYER_Y_OFFSET, targetZ]}
    >
      {/* Body */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[BODY_W, BODY_H, BODY_W]} />
        <meshLambertMaterial color={darkerColor} />
      </mesh>

      {/* Head */}
      <mesh castShadow position={[0, BODY_H / 2 + HEAD_SIZE / 2, 0]}>
        <boxGeometry args={[HEAD_SIZE, HEAD_SIZE, HEAD_SIZE]} />
        <meshLambertMaterial color={playerColor} />
      </mesh>

      {/* Eyes (local player gets a subtle outline) */}
      {isLocal && (
        <mesh position={[0, BODY_H / 2 + HEAD_SIZE / 2, HEAD_SIZE / 2 + 0.01]}>
          <planeGeometry args={[HEAD_SIZE * 0.8, HEAD_SIZE * 0.2]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Name label — always faces camera */}
      <Text
        position={[0, BODY_H / 2 + HEAD_SIZE + 0.15, 0]}
        fontSize={0.22}
        color={isLocal ? '#FFD700' : '#FFFFFF'}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#000000"
        renderOrder={1}
      >
        {player.name}
      </Text>
    </group>
  );
}
