'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Player } from '@/src/shared/types';
import { BLOCK_SIZE, LERP_SPEED } from '@/src/lib/constants';
import { spawnParticles } from './ParticleSystem';
import { useGameStore } from '@/src/stores/gameStore';

interface PlayerMeshProps {
  player: Player;
  isLocal: boolean;
}

const PLAYER_Y_OFFSET = 0.45; // sits on top of block

// ---------------------------------------------------------------------------
//  PlayerMesh — voxel character loading 3D GLB with 6 custom animations
// ---------------------------------------------------------------------------
export function PlayerMesh({ player, isLocal }: PlayerMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Group>(null);
  const deathTimer = useRef(0);
  const idleTimer = useRef(0);
  const playerFallingY = useRef(0);

  const halfGrid = (12 / 2 - 0.5) * BLOCK_SIZE;

  // Target world position from grid coords
  const targetX = player.position.x * BLOCK_SIZE - halfGrid;
  const targetZ = player.position.z * BLOCK_SIZE - halfGrid;

  // Death animation state
  const wasAlive = useRef(player.isAlive);
  const isDead = !player.isAlive;

  // Initialize group position once on mount so we don't snap/override in JSX
  const positionInitialized = useRef(false);
  useEffect(() => {
    if (groupRef.current && !positionInitialized.current) {
      groupRef.current.position.set(targetX, PLAYER_Y_OFFSET, targetZ);
      positionInitialized.current = true;
    }
  }, [targetX, targetZ]);

  // Load the cyber voxel player model
  const { scene: rawScene, animations } = useGLTF('/models/player.glb');
  
  // Clone the scene and deep clone its materials so each player has independent bones and materials
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(rawScene);
    clone.traverse((node) => {
      if (node instanceof THREE.Mesh && node.material) {
        if (Array.isArray(node.material)) {
          node.material = node.material.map(m => m.clone());
        } else {
          node.material = node.material.clone();
        }
      }
    });
    return clone;
  }, [rawScene]);

  // Bind animation actions to the top-level group reference
  const { actions } = useAnimations(animations, groupRef);
  
  // Store actions in a ref to avoid ESLint immutability errors in useFrame
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const activeAction = useRef<THREE.AnimationAction | null>(null);

  // Transition smoothly between different voxel states
  const transitionTo = (name: string, duration = 0.15, loopType: THREE.AnimationActionLoopStyles = THREE.LoopRepeat) => {
    const action = actionsRef.current[name];
    if (!action) return;

    if (activeAction.current === action) {
      if (!action.isRunning()) {
        action.play();
      }
      return;
    }

    const prevAction = activeAction.current;
    activeAction.current = action;

    action.setLoop(loopType, loopType === THREE.LoopOnce ? 1 : Infinity);
    if (loopType === THREE.LoopOnce) {
      action.clampWhenFinished = true;
    }

    action.reset();
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.fadeIn(duration);
    action.play();

    if (prevAction) {
      prevAction.fadeOut(duration);
    }
  };

  // Generate custom 16x16 pixel-perfect textures for this player's color
  const textures = useMemo(() => {
    if (typeof window === 'undefined') return null;

    // 1. Create albedo (color) canvas
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = 16;
    colorCanvas.height = 16;
    const ctx = colorCanvas.getContext('2d');
    if (!ctx) return null;

    // Default fill (cyber slate)
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, 16, 16);

    // Draw suit color (0,0 to 3,3) - vibrant player unique color!
    ctx.fillStyle = player.color;
    ctx.fillRect(0, 0, 4, 4);

    // Draw visor color (4,0 to 7,3) - neon cyan!
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(4, 0, 4, 4);

    // Draw reactor / soles (8,0 to 11,3) - neon magenta!
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(8, 0, 4, 4);

    // Draw headphones (12,0 to 15,3) - high-contrast crisp white!
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 0, 4, 4);

    // Draw accent yellow (0,4 to 3,7)
    ctx.fillStyle = '#ffe600';
    ctx.fillRect(0, 4, 4, 4);

    // Draw secondary dark (4,4 to 7,7)
    ctx.fillStyle = '#0e0e14';
    ctx.fillRect(4, 4, 4, 4);

    // 2. Create emissive canvas (only visor and heart/soles glow)
    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = 16;
    emissiveCanvas.height = 16;
    const eCtx = emissiveCanvas.getContext('2d');
    if (!eCtx) return null;

    // Default black (no emission)
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 16, 16);

    // Visor glows cyan (4,0 to 7,3)
    eCtx.fillStyle = '#00f3ff';
    eCtx.fillRect(4, 0, 4, 4);

    // Reactor / soles glow magenta (8,0 to 11,3)
    eCtx.fillStyle = '#ff007f';
    eCtx.fillRect(8, 0, 4, 4);

    // Convert to Three.js textures
    const colorTex = new THREE.CanvasTexture(colorCanvas);
    colorTex.magFilter = THREE.NearestFilter; // Sharp voxel pixels!
    colorTex.minFilter = THREE.NearestFilter;
    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.flipY = false; // Match GLTF coordinate system!

    const emissiveTex = new THREE.CanvasTexture(emissiveCanvas);
    emissiveTex.magFilter = THREE.NearestFilter;
    emissiveTex.minFilter = THREE.NearestFilter;
    emissiveTex.flipY = false; // Match GLTF coordinate system!

    return { colorTex, emissiveTex };
  }, [player.color]);

  // Traverse the glTF hierarchy to inject material parameters & custom textures
  useEffect(() => {
    if (!textures) return;

    clonedScene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;

        if (node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          
          materials.forEach((originalMat) => {
            if ('color' in originalMat) {
              const mat = originalMat as THREE.MeshStandardMaterial;
              
              // Reset material base color to white to avoid multiplying/darkening our textures
              mat.color.set('#ffffff');
              
              // Map our dynamic, high-contrast, sharp color textures
              mat.map = textures.colorTex;
              mat.emissiveMap = textures.emissiveTex;
              mat.emissive.set('#ffffff'); // Enable full texture emission color
              mat.emissiveIntensity = 3.0; // High bloom intensity!
              
              mat.roughness = 0.3;
              mat.metalness = 0.2;
              
              // Force texture and material updates
              textures.colorTex.needsUpdate = true;
              textures.emissiveTex.needsUpdate = true;
              mat.needsUpdate = true;
            }
          });
        }
      }
    });
  }, [clonedScene, textures]);

  // Handle spawn and death transitions with custom particles
  useEffect(() => {
    if (wasAlive.current && isDead) {
      spawnParticles({
        x: targetX,
        y: PLAYER_Y_OFFSET,
        z: targetZ,
        color: player.color, // Vibrant player neon dust on elimination
        count: 25,
        type: 'dust'
      });
      wasAlive.current = false;
    } else if (!wasAlive.current && !isDead) {
      deathTimer.current = 0;
      if (groupRef.current) {
        groupRef.current.scale.setScalar(1);
        groupRef.current.position.set(targetX, PLAYER_Y_OFFSET, targetZ);
        groupRef.current.visible = true;
      }
      wasAlive.current = true;
    }
  }, [isDead, targetX, targetZ, player.color]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    const phase = useGameStore.getState().gameState?.phase;

    if (isDead) {
      // If the player has already finished their death sequence in a previous round, keep them invisible
      if (deathTimer.current > 1.5) {
        g.visible = false;
        return;
      }

      // If they just died and it's not the ELIMINATING phase, run the normal death sequence
      if (phase !== 'ELIMINATING') {
        deathTimer.current += delta;
        transitionTo('death', 0.2, THREE.LoopOnce);
        return;
      }
    }

    g.visible = true;

    // Calculate falling Y offset if player is on an eliminated block during ELIMINATING phase
    if (phase === 'ELIMINATING') {
      const gameState = useGameStore.getState().gameState;
      const block = gameState?.blocks?.[player.position.z]?.[player.position.x];
      if (block && !block.isActive) {
        playerFallingY.current -= delta * 8; // FALL_SPEED is 8 units/s
      } else {
        playerFallingY.current = 0;
      }
    } else {
      playerFallingY.current = 0;
    }

    // Smooth client position interpolation
    const lerpFactor = 1 - Math.pow(0.001, delta * LERP_SPEED);
    g.position.x += (targetX - g.position.x) * lerpFactor;
    g.position.z += (targetZ - g.position.z) * lerpFactor;
    g.position.y = PLAYER_Y_OFFSET + playerFallingY.current;

    // Velocity detection to toggle walking and smooth rotation
    const dx = targetX - g.position.x;
    const dz = targetZ - g.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const isMoving = dist > 0.015;

    if (isMoving) {
      idleTimer.current = 0;
      if (meshRef.current) {
        const targetAngle = Math.atan2(dx, dz) + Math.PI; // Add PI to flip 180 degrees
        const currentAngle = meshRef.current.rotation.y;
        
        let diff = targetAngle - currentAngle;
        // Wrap to [-PI, PI] to rotate through the shortest path
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        
        const rotLerpFactor = 1 - Math.pow(0.001, delta * 15); // Fast, organic rotation lerp
        meshRef.current.rotation.y += diff * rotLerpFactor;
      }
    } else {
      idleTimer.current += delta;
    }

    // Phase-specific animation selector
    let nextAnim = 'idle';
    let loopType: THREE.AnimationActionLoopStyles = THREE.LoopRepeat;

    if (isDead) {
      nextAnim = 'death';
      loopType = THREE.LoopOnce;
    } else if (phase === 'GAME_OVER') {
      const winnerId = useGameStore.getState().gameState?.winnerId;
      if (player.id === winnerId) {
        nextAnim = 'celebrate';
      } else {
        nextAnim = 'idle';
      }
    } else if (phase === 'LOBBY') {
      nextAnim = player.isReady ? 'dance' : 'idle';
    } else if (phase === 'DANCING' || phase === 'ANNOUNCING') {
      if (isMoving) {
        nextAnim = 'walk';
      } else if (idleTimer.current < 0.7) {
        nextAnim = 'idle';
      } else {
        nextAnim = 'dance';
      }
    } else {
      nextAnim = 'idle';
    }

    transitionTo(nextAnim, 0.15, loopType);
  });

  return (
    <group
      ref={groupRef}
    >
      {/* Voxel Animated Model wrapped in a sub-group for independent rotation */}
      <group ref={meshRef} position={[0, -0.45, 0]}>
        <primitive object={clonedScene} scale={0.06} position={[0, 0, 0]} />
      </group>

      {/* Floating text name label */}
      <Text
        position={[0, 1.55, 0]}
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

useGLTF.preload('/models/player.glb');

