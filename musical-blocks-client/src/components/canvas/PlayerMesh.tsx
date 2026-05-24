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
import { MUSIC_TRACKS } from '@/src/hooks/useAudio';

interface PlayerMeshProps {
  player: Player;
  isLocal: boolean;
  isPreview?: boolean;
}

const PLAYER_Y_OFFSET = 0.45; // sits on top of block

// ---------------------------------------------------------------------------
//  PlayerMesh — voxel character loading 3D GLB with 6 custom animations
// ---------------------------------------------------------------------------
export function PlayerMesh({ player, isLocal, isPreview = false }: PlayerMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Group>(null);
  const companionRef = useRef<THREE.Group>(null);
  const deathTimer = useRef(0);
  const idleTimer = useRef(0);
  const playerFallingY = useRef(0);
  const trailTimer = useRef(0);
  const playerMaterials = useRef<THREE.MeshStandardMaterial[]>([]);

  // Refs for procedural companion animations
  const leftReelRef = useRef<THREE.Mesh>(null);
  const rightReelRef = useRef<THREE.Mesh>(null);
  const shutterRef = useRef<THREE.Mesh>(null);
  const orbCoreRef = useRef<THREE.Mesh>(null);

  // Refs for Cyber-Backpack animations and particles
  const backpackRef = useRef<THREE.Group>(null);
  const led1Ref = useRef<THREE.Mesh>(null);
  const led2Ref = useRef<THREE.Mesh>(null);
  const led3Ref = useRef<THREE.Mesh>(null);
  const leftNozzleRef = useRef<THREE.Mesh>(null);
  const rightNozzleRef = useRef<THREE.Mesh>(null);

  // Refs for Cyber-Headphones and beat-sync
  const headphoneRef = useRef<THREE.Group>(null);
  const headphoneLeftRingRef = useRef<THREE.Mesh>(null);
  const headphoneLeftDotRef = useRef<THREE.Mesh>(null);
  const headphoneRightRingRef = useRef<THREE.Mesh>(null);
  const headphoneRightDotRef = useRef<THREE.Mesh>(null);

  // Refs for animated bone tracking
  const headBoneRef = useRef<THREE.Object3D | null>(null);
  const torsoBoneRef = useRef<THREE.Object3D | null>(null);

  // Stably assign a dance animation (dance or dance2) based on player ID
  const danceAnimName = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < player.id.length; i++) {
      hash += player.id.charCodeAt(i);
    }
    return hash % 2 === 0 ? 'dance' : 'dance2';
  }, [player.id]);

  // Extract and default player cosmetics
  const cosmetics = useMemo(() => {
    console.log(`[PlayerMesh Debug] Player "${player.name}" (${player.id}) cosmetics:`, player.cosmetics);
    return player.cosmetics || {
      companionType: 'none',
      headphonesEnabled: false,
      backpackEnabled: false,
      skinMaterial: 'matte'
    };
  }, [player.cosmetics, player.name, player.id]);

  // Read companionType from dynamic player cosmetics
  const companionType = useMemo(() => {
    return cosmetics.companionType;
  }, [cosmetics.companionType]);

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
    if (isPreview) return;
    if (groupRef.current && !positionInitialized.current) {
      groupRef.current.position.set(targetX, PLAYER_Y_OFFSET, targetZ);
      positionInitialized.current = true;
    }
  }, [targetX, targetZ, isPreview]);

  // Load the cyber voxel player model
  const { scene: rawScene, animations } = useGLTF('/models/player.glb?v=5');
  
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

  // Find and store bone references for real-time declarative attachment binding
  useEffect(() => {
    headBoneRef.current = clonedScene.getObjectByName('Head') || null;
    torsoBoneRef.current = clonedScene.getObjectByName('Torso') || null;
  }, [clonedScene]);

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

  // Ref to hold the mutable HTML Canvas textures, allowing high-performance updates inside useFrame
  const texturesRef = useRef<{
    colorCanvas: HTMLCanvasElement;
    emissiveCanvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    eCtx: CanvasRenderingContext2D;
    colorTex: THREE.CanvasTexture;
    emissiveTex: THREE.CanvasTexture;
  } | null>(null);

  // Clean up cloned materials and geometries when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      clonedScene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          if (node.geometry) {
            node.geometry.dispose();
          }
          if (node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((mat) => mat.dispose());
          }
        }
      });
    };
  }, [clonedScene]);

  // Generate dynamic 16x16 pixel-perfect textures and map them to materials in a safe React lifecycle effect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Create albedo (color) canvas
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = 16;
    colorCanvas.height = 16;
    const ctx = colorCanvas.getContext('2d');
    if (!ctx) return;

    // Default fill (cyber slate)
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, 16, 16);

    // Draw suit color (0,0 to 3,3) - vibrant player unique color!
    // Always draw player.color in albedo (the neon fix is done via mat.emissive directly)
    ctx.fillStyle = player.color;
    ctx.fillRect(0, 0, 4, 4);

    // Draw visor color (4,0 to 7,3) - dynamic visor!
    ctx.fillStyle = cosmetics.visorColor ?? '#00f3ff';
    ctx.fillRect(4, 0, 4, 4);

    // Draw reactor / soles (8,0 to 11,3) - dynamic reactor!
    ctx.fillStyle = cosmetics.heartColor ?? '#ff007f';
    ctx.fillRect(8, 0, 4, 4);

    // Draw headphones (12,0 to 15,3) - high-contrast crisp white!
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 0, 4, 4);

    // Draw accent soles/shoes (0,4 to 3,7) - dynamic shoes!
    ctx.fillStyle = cosmetics.shoesColor ?? '#ffe600';
    ctx.fillRect(0, 4, 4, 4);

    // Draw secondary dark (4,4 to 7,7)
    ctx.fillStyle = '#0e0e14';
    ctx.fillRect(4, 4, 4, 4);

    // 2. Create emissive canvas (only visor and heart/soles glow)
    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = 16;
    emissiveCanvas.height = 16;
    const eCtx = emissiveCanvas.getContext('2d');
    if (!eCtx) return;

    // Default black (no emission)
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 16, 16);

    // Visor glows dynamically (4,0 to 7,3)
    eCtx.fillStyle = cosmetics.visorColor ?? '#00f3ff';
    eCtx.fillRect(4, 0, 4, 4);

    // Reactor / soles glow dynamically (8,0 to 11,3)
    eCtx.fillStyle = cosmetics.heartColor ?? '#ff007f';
    eCtx.fillRect(8, 0, 4, 4);

    // Neon holographic skin: fill the ENTIRE canvas with player.color first,
    // then overlay visor and reactor on top so they still show through!
    if (cosmetics.skinMaterial === 'neon') {
      eCtx.fillStyle = player.color;
      eCtx.fillRect(0, 0, 16, 16); // whole body glows in player color
      // Re-draw visor (cyan) and reactor (magenta) ON TOP so they remain visible
      eCtx.fillStyle = cosmetics.visorColor ?? '#00f3ff';
      eCtx.fillRect(4, 0, 4, 4);
      eCtx.fillStyle = cosmetics.heartColor ?? '#ff007f';
      eCtx.fillRect(8, 0, 4, 4);
    }

    // Convert to Three.js textures
    const colorTex = new THREE.CanvasTexture(colorCanvas);
    colorTex.magFilter = THREE.NearestFilter; // Sharp voxel pixels!
    colorTex.minFilter = THREE.NearestFilter;
    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.flipY = false; // Match GLTF coordinate system!

    const emissiveTex = new THREE.CanvasTexture(emissiveCanvas);
    emissiveTex.magFilter = THREE.NearestFilter;
    emissiveTex.minFilter = THREE.NearestFilter;
    emissiveTex.colorSpace = THREE.SRGBColorSpace; // Canvas draws sRGB colors — tell Three.js to decode properly
    emissiveTex.flipY = false; // Match GLTF coordinate system!

    // Save references to allow safe, fast frame updates in useFrame
    texturesRef.current = {
      colorCanvas,
      emissiveCanvas,
      ctx,
      eCtx,
      colorTex,
      emissiveTex
    };

    // Traverse the glTF hierarchy to inject material parameters & custom textures
    const mats: THREE.MeshStandardMaterial[] = [];
    clonedScene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;

        if (node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          
          materials.forEach((originalMat) => {
            if ('color' in originalMat) {
              const mat = originalMat as THREE.MeshStandardMaterial;
              
              if (cosmetics.skinMaterial === 'neon') {
                // For neon: albedo = BLACK so that ambient/directional lights add ZERO to
                // the final pixel color (diffuse = black × any_light = black).
                // All color comes EXCLUSIVELY from emissiveMap × emissive(white) × intensity.
                // emissiveMap is filled: player.color body + cyan visor + magenta reactor.
                mat.color.set('#000000');
                mat.map = null;         // No albedo map — color must only come from emissive
                mat.emissive.set('#ffffff');
                mat.emissiveMap = emissiveTex;
                mat.emissiveIntensity = 1.0; // ACES tone mapping: 1.0→0.804 = vivid color. 2.5→0.938 = cream/white.
                mat.roughness = 1.0;
                mat.metalness = 0.0;
                mat.transparent = false;
                mat.opacity = 1.0;
                mat.depthWrite = true;
              } else {
                // Reset material base color to white to avoid multiplying/darkening our textures
                mat.color.set('#ffffff');
                // Map our dynamic, high-contrast, sharp color textures
                mat.map = colorTex;
                mat.emissiveMap = emissiveTex;
                mat.emissive.set('#ffffff'); // Enable full texture emission color
                mat.emissiveIntensity = 3.0; // High bloom intensity!
                
                if (cosmetics.skinMaterial === 'chrome') {
                  mat.roughness = 0.08;
                  mat.metalness = 0.55;
                  mat.transparent = false;
                  mat.opacity = 1.0;
                  mat.depthWrite = true;
                } else { // 'matte'
                  mat.roughness = 0.85;
                  mat.metalness = 0.05;
                  mat.transparent = false;
                  mat.opacity = 1.0;
                  mat.depthWrite = true;
                }
              }
              
              // Force texture and material updates
              colorTex.needsUpdate = true;
              emissiveTex.needsUpdate = true;
              mat.needsUpdate = true;

              mats.push(mat);
            }
          });
        }
      }
    });

    playerMaterials.current = mats;

    // Clean up WebGL textures and canvas backing stores when unmounted to prevent GPU memory leaks
    return () => {
      if (texturesRef.current) {
        texturesRef.current.colorTex.dispose();
        texturesRef.current.emissiveTex.dispose();
        // Zero-size the canvas dimensions to force the browser to immediately free memory
        texturesRef.current.colorCanvas.width = 0;
        texturesRef.current.colorCanvas.height = 0;
        texturesRef.current.emissiveCanvas.width = 0;
        texturesRef.current.emissiveCanvas.height = 0;
        texturesRef.current = null;
      }
    };
  }, [player.color, clonedScene, cosmetics]);

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

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    const phase = useGameStore.getState().gameState?.phase ?? 'LOBBY';

    // -------------------------------------------------------------------------
    //  1. Active Beat Sync (BPM detection and sawtooth envelope pulse)
    // -------------------------------------------------------------------------
    const isLobby = phase === 'LOBBY';
    const isPlayingGame = phase === 'STARTING' || phase === 'DANCING' || phase === 'ANNOUNCING';
    
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

    if (!isPlaying) {
      if (isLobby) {
        activeBpm = 110;
      } else if (isPlayingGame) {
        const gameSpeed = useGameStore.getState().room?.settings?.gameSpeed || 'NORMAL';
        const roomId = useGameStore.getState().room?.id || 'DEFAULT';
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
    if (activeBpm > 0 && player.isAlive) {
      const elapsedBeats = seekTime * (activeBpm / 60);
      const beatProgress = elapsedBeats % 1;
      beatPulse = Math.pow(1 - beatProgress, 4); // exponential decay synth envelope
    }

    // -------------------------------------------------------------------------
    //  1.5. Dynamic Skeletal Bone Attachments Alignment (Procedural Headphones & Backpack)
    // -------------------------------------------------------------------------
    if (player.isAlive && meshRef.current) {
      // Align cyber-headphones with the Head bone
      if (headBoneRef.current && headphoneRef.current) {
        headBoneRef.current.updateWorldMatrix(true, false);
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        headBoneRef.current.getWorldPosition(worldPos);
        headBoneRef.current.getWorldQuaternion(worldQuat);
        
        meshRef.current.worldToLocal(worldPos);
        
        const parentWorldQuat = new THREE.Quaternion();
        meshRef.current.getWorldQuaternion(parentWorldQuat);
        const localQuat = parentWorldQuat.clone().invert().multiply(worldQuat);
        
        headphoneRef.current.position.copy(worldPos);
        headphoneRef.current.quaternion.copy(localQuat);
      }

      // Align cyber-backpack with the Torso bone
      if (torsoBoneRef.current && backpackRef.current) {
        torsoBoneRef.current.updateWorldMatrix(true, false);
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        torsoBoneRef.current.getWorldPosition(worldPos);
        torsoBoneRef.current.getWorldQuaternion(worldQuat);
        
        meshRef.current.worldToLocal(worldPos);
        
        const parentWorldQuat = new THREE.Quaternion();
        meshRef.current.getWorldQuaternion(parentWorldQuat);
        const localQuat = parentWorldQuat.clone().invert().multiply(worldQuat);
        
        backpackRef.current.position.copy(worldPos);
        backpackRef.current.quaternion.copy(localQuat);
      }
    }

    // -------------------------------------------------------------------------
    //  2. Floating Bobbing Retro Companion Accessory
    // -------------------------------------------------------------------------
    if (companionRef.current && player.isAlive) {
      // Floating sinusoidal bobbing + orbit rotation further to the side to avoid clipping
      companionRef.current.position.x = 0.72 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
      companionRef.current.position.y = 1.1 + Math.sin(state.clock.elapsedTime * 2.5) * 0.06;
      companionRef.current.position.z = 0.15 + Math.cos(state.clock.elapsedTime * 1.5) * 0.03;
      
      if (companionType === 'orb') {
        companionRef.current.rotation.y = state.clock.elapsedTime * 0.8;
        if (orbCoreRef.current) {
          // Sphere expands to the beat pulse
          const scale = 1.0 + beatPulse * 0.35;
          orbCoreRef.current.scale.set(scale, scale, scale);
        }
      } else if (companionType === 'cassette') {
        companionRef.current.rotation.y = state.clock.elapsedTime * 1.2;
        companionRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.12;
        
        // Spin tape reels
        if (leftReelRef.current) {
          leftReelRef.current.rotation.y = state.clock.elapsedTime * 4.0;
        }
        if (rightReelRef.current) {
          rightReelRef.current.rotation.y = state.clock.elapsedTime * 4.0;
        }
      } else if (companionType === 'floppy') {
        companionRef.current.rotation.y = state.clock.elapsedTime * 1.2;
        companionRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.12;
        
        // Slide shutter back and forth to the beat!
        if (shutterRef.current) {
          shutterRef.current.position.x = 0.05 - beatPulse * 0.025;
        }
      }
    }

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
    if (isPreview) {
      g.position.set(0, 0, 0);
      if (meshRef.current) {
        meshRef.current.rotation.y += delta * 0.18; // Much slower, majestic rotation on its own axis
      }
    } else {
      const lerpFactor = 1 - Math.pow(0.001, delta * LERP_SPEED);
      g.position.x += (targetX - g.position.x) * lerpFactor;
      g.position.z += (targetZ - g.position.z) * lerpFactor;
      g.position.y = PLAYER_Y_OFFSET + playerFallingY.current;
    }

    // Velocity detection to toggle walking and smooth rotation
    const dx = isPreview ? 0 : targetX - g.position.x;
    const dz = isPreview ? 0 : targetZ - g.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const isMoving = !isPreview && dist > 0.015;

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
    } else if (isPreview) {
      nextAnim = danceAnimName; // always dance in premium cosmetics preview!
    } else if (phase === 'GAME_OVER') {
      const winnerId = useGameStore.getState().gameState?.winnerId;
      if (player.id === winnerId) {
        nextAnim = 'celebrate';
      } else {
        nextAnim = 'idle';
      }
    } else if (phase === 'LOBBY') {
      nextAnim = player.isReady ? danceAnimName : 'idle';
    } else if (phase === 'STARTING' || phase === 'DANCING' || phase === 'ANNOUNCING') {
      if (isMoving) {
        nextAnim = 'walk';
      } else if (idleTimer.current < 0.7) {
        nextAnim = 'idle';
      } else {
        nextAnim = danceAnimName;
      }
    } else {
      nextAnim = 'idle';
    }

    transitionTo(nextAnim, 0.15, loopType);

    // -------------------------------------------------------------------------
    //  3. Digital Foot Particle Trails (Dust Grid) & Thruster Dual Exhaust Trails
    // -------------------------------------------------------------------------
    if (isMoving && !isDead) {
      trailTimer.current += delta;
      if (trailTimer.current > 0.07) { // spawn pixel trace every 70ms
        trailTimer.current = 0;
        
        // 3a. Digital Foot footprints
        spawnParticles({
          x: g.position.x + (Math.random() - 0.5) * 0.05,
          y: g.position.y - 0.42, // soles of their feet
          z: g.position.z + (Math.random() - 0.5) * 0.05,
          color: player.color,
          count: 1,
          type: 'dust'
        });

        // 3b. Dual Thruster Digital Exhaust particles
        if (leftNozzleRef.current && rightNozzleRef.current) {
          const leftPos = new THREE.Vector3();
          const rightPos = new THREE.Vector3();
          leftNozzleRef.current.getWorldPosition(leftPos);
          rightNozzleRef.current.getWorldPosition(rightPos);

          // Left side: hot-pink trail (#ff007f)
          spawnParticles({
            x: leftPos.x,
            y: leftPos.y,
            z: leftPos.z,
            color: '#ff007f',
            count: 1,
            type: 'dust'
          });

          // Right side: player themed color trail
          spawnParticles({
            x: rightPos.x,
            y: rightPos.y,
            z: rightPos.z,
            color: player.color,
            count: 1,
            type: 'dust'
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    //  4. Visor, Reactor & Auriculares real-time LED Canvas Redraw
    // -------------------------------------------------------------------------
    const textures = texturesRef.current;
    if (textures && player.isAlive) {
      const { ctx, eCtx } = textures;
      const time = state.clock.elapsedTime;
      const visorColor = '#00f3ff';
      const neonPink = '#ff007f';

      // 4a. Visor rendering
      ctx.fillStyle = '#1a1a24'; // suit background
      ctx.fillRect(4, 0, 4, 4);
      eCtx.fillStyle = '#000000'; // black = no glow
      eCtx.fillRect(4, 0, 4, 4);

      if (nextAnim === 'death' || phase === 'ELIMINATING') {
        // x_x eyes
        ctx.fillStyle = '#ff0055';
        eCtx.fillStyle = '#ff0055';
        ctx.fillRect(4, 1, 1, 1);
        ctx.fillRect(7, 1, 1, 1);
        ctx.fillRect(5, 2, 1, 1);
        ctx.fillRect(6, 2, 1, 1);
        ctx.fillRect(4, 3, 1, 1);
        ctx.fillRect(7, 3, 1, 1);

        eCtx.fillRect(4, 1, 1, 1);
        eCtx.fillRect(7, 1, 1, 1);
        eCtx.fillRect(5, 2, 1, 1);
        eCtx.fillRect(6, 2, 1, 1);
        eCtx.fillRect(4, 3, 1, 1);
        eCtx.fillRect(7, 3, 1, 1);
      } 
      else if (nextAnim === 'celebrate' || phase === 'GAME_OVER') {
        // Heart symbol <3 pulsing
        ctx.fillStyle = neonPink;
        eCtx.fillStyle = neonPink;
        
        const isPulse = Math.floor(time * 5) % 2 === 0;
        if (isPulse) {
          ctx.fillRect(5, 1, 2, 2);
          eCtx.fillRect(5, 1, 2, 2);
        } else {
          ctx.fillRect(4, 0, 1, 1);
          ctx.fillRect(7, 0, 1, 1);
          ctx.fillRect(4, 1, 4, 1);
          ctx.fillRect(5, 2, 2, 2);

          eCtx.fillRect(4, 0, 1, 1);
          eCtx.fillRect(7, 0, 1, 1);
          eCtx.fillRect(4, 1, 4, 1);
          eCtx.fillRect(5, 2, 2, 2);
        }
      } 
      else if (nextAnim === 'dance' || nextAnim === 'dance2') {
        // Audio Equalizer bars
        ctx.fillStyle = visorColor;
        eCtx.fillStyle = visorColor;

        const h0 = Math.max(1, Math.floor(1 + beatPulse * 3));
        const h1 = Math.max(1, Math.floor(1 + (Math.sin(time * 12) * 0.5 + 0.5) * 3));
        const h2 = Math.max(1, Math.floor(1 + (Math.cos(time * 10) * 0.5 + 0.5) * 3));
        const h3 = Math.max(1, Math.floor(1 + beatPulse * 3));

        for (let y = 0; y < h0; y++) { ctx.fillRect(4, 3 - y, 1, 1); eCtx.fillRect(4, 3 - y, 1, 1); }
        for (let y = 0; y < h1; y++) { ctx.fillRect(5, 3 - y, 1, 1); eCtx.fillRect(5, 3 - y, 1, 1); }
        for (let y = 0; y < h2; y++) { ctx.fillRect(6, 3 - y, 1, 1); eCtx.fillRect(6, 3 - y, 1, 1); }
        for (let y = 0; y < h3; y++) { ctx.fillRect(7, 3 - y, 1, 1); eCtx.fillRect(7, 3 - y, 1, 1); }
      } 
      else if (isMoving) {
        // Scrolling dot direction arrow
        ctx.fillStyle = visorColor;
        eCtx.fillStyle = visorColor;
        const offset = Math.floor(time * 12) % 4;
        ctx.fillRect(4 + offset, 1, 1, 2);
        eCtx.fillRect(4 + offset, 1, 1, 2);
      } 
      else {
        // Normal blinking eyes
        ctx.fillStyle = visorColor;
        eCtx.fillStyle = visorColor;
        const isBlink = (Math.floor(time) % 3 === 0) && ((time % 1) < 0.12);
        if (isBlink) {
          ctx.fillRect(4, 2, 4, 1);
          eCtx.fillRect(4, 2, 4, 1);
        } else {
          ctx.fillRect(4, 1, 1, 2);
          ctx.fillRect(6, 1, 1, 2);
          eCtx.fillRect(4, 1, 1, 2);
          eCtx.fillRect(6, 1, 1, 2);
        }
      }

      // 4b. Chest Reactor pulse
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(8, 0, 4, 4);
      eCtx.fillStyle = '#000000';
      eCtx.fillRect(8, 0, 4, 4);

      ctx.fillStyle = neonPink;
      eCtx.fillStyle = neonPink;

      if (beatPulse > 0.45) {
        // Pulsing larger arc reactor shape
        ctx.fillRect(9, 0, 2, 1);
        ctx.fillRect(8, 1, 4, 2);
        ctx.fillRect(9, 3, 2, 1);

        eCtx.fillRect(9, 0, 2, 1);
        eCtx.fillRect(8, 1, 4, 2);
        eCtx.fillRect(9, 3, 2, 1);
      } else {
        // Rest state core
        ctx.fillRect(9, 1, 2, 2);
        eCtx.fillRect(9, 1, 2, 2);
      }

      // Flag Three.js dynamic canvas textures to refresh in GPU memory
      textures.colorTex.needsUpdate = true;
      textures.emissiveTex.needsUpdate = true;
    }

    // -------------------------------------------------------------------------
    //  4c. Cyber-Backpack LED Indicators Sequential BPM Chasing & Nozzles Pulse
    // -------------------------------------------------------------------------
    if (player.isAlive) {
      const time = state.clock.elapsedTime;

      // LED Chasing: Synced to BPM. Sequential 8th-note style chasing.
      const led1Mat = led1Ref.current?.material as THREE.MeshStandardMaterial;
      const led2Mat = led2Ref.current?.material as THREE.MeshStandardMaterial;
      const led3Mat = led3Ref.current?.material as THREE.MeshStandardMaterial;
      if (led1Mat && led2Mat && led3Mat) {
        const beatCount = seekTime * (activeBpm / 60);
        const activeLED = Math.floor(beatCount * 2.0) % 3; // double-speed chase
        const fraction = (beatCount * 2.0) % 1;
        
        const mats = [led1Mat, led2Mat, led3Mat];
        mats.forEach((mat, idx) => {
          if (idx === activeLED) {
            // High brightness decaying smoothly to create a sleek trail
            const decay = Math.pow(1 - fraction, 2);
            mat.emissiveIntensity = 2.0 + decay * 8.0;
          } else {
            // Soft neon ambient flow
            mat.emissiveIntensity = 0.6 + beatPulse * 1.5;
          }
        });
      }

      // Thruster Nozzle scaling & glow vibration
      const nozzles = [leftNozzleRef.current, rightNozzleRef.current];
      nozzles.forEach((nozzle) => {
        if (nozzle) {
          if (isMoving) {
            // Rapid engine vibration scaling + beat flare
            const vib = 1.0 + beatPulse * 0.4 + Math.sin(time * 35) * 0.12;
            nozzle.scale.set(vib, vib, vib);
            
            if (nozzle.material instanceof THREE.MeshStandardMaterial) {
              nozzle.material.emissiveIntensity = 5.0 + beatPulse * 5.0;
            }
          } else {
            // Low idle resting core scale and soft glow
            nozzle.scale.set(0.6, 0.6, 0.6);
            if (nozzle.material instanceof THREE.MeshStandardMaterial) {
              nozzle.material.emissiveIntensity = 1.5;
            }
          }
        }
      });

      // Cyber-Headphones Beat-Sync Pulse
      const hpLeftRingMat = headphoneLeftRingRef.current?.material as THREE.MeshStandardMaterial;
      const hpLeftDotMat = headphoneLeftDotRef.current?.material as THREE.MeshStandardMaterial;
      const hpRightRingMat = headphoneRightRingRef.current?.material as THREE.MeshStandardMaterial;
      const hpRightDotMat = headphoneRightDotRef.current?.material as THREE.MeshStandardMaterial;
      const hpMats = [hpLeftRingMat, hpLeftDotMat, hpRightRingMat, hpRightDotMat];
      hpMats.forEach((mat) => {
        if (mat) {
          mat.emissiveIntensity = 2.0 + beatPulse * 6.0;
        }
      });
    }

    // -------------------------------------------------------------------------
    //  5. Beat Pulse emissive intensity modulation
    // -------------------------------------------------------------------------
    if (playerMaterials.current.length > 0 && player.isAlive) {
      playerMaterials.current.forEach((mat) => {
        if (cosmetics.skinMaterial === 'neon') {
          // ACES tone mapping compresses high values → white. Keep intensity ≤1.5.
          // ACES(1.0)=0.804 (vivid), ACES(1.5)=0.879 (bright), ACES(2.5)=0.938 (cream/white).
          mat.emissiveIntensity = 1.0 + beatPulse * 0.4;
        } else if (cosmetics.skinMaterial === 'chrome') {
          mat.emissiveIntensity = 0.8 + beatPulse * 0.6;
        } else {
          mat.emissiveIntensity = 2.0 + beatPulse * 2.0;
        }
      });
    }
  });

  return (
    <group
      ref={groupRef}
    >
      {/* Voxel Animated Model wrapped in a sub-group for independent rotation */}
      <group ref={meshRef} position={[0, -0.45, 0]} rotation={[0, isPreview ? Math.PI : 0, 0]}>
        <primitive object={clonedScene} scale={0.96} position={[0, 0, 0]} />

        {/* Declarative Procedural Cyber-Headphones */}
        {player.isAlive && cosmetics.headphonesEnabled && (
          <group ref={headphoneRef}>
            {/* 1. Headband (half-torus arching over the head) */}
            <mesh castShadow position={[0, 0.31, 0]}>
              <torusGeometry args={[0.37, 0.018, 8, 24, Math.PI]} />
              <meshStandardMaterial color="#1c1c24" roughness={0.18} metalness={0.8} />
            </mesh>

            {/* Headband center neon status band */}
            <mesh position={[0, 0.68, 0]} castShadow>
              <boxGeometry args={[0.05, 0.024, 0.04]} />
              <meshStandardMaterial color="#00f3ff" emissive="#00f3ff" emissiveIntensity={3.0} />
            </mesh>

            {/* 2. Ear Cups (Left and Right) */}
            {/* Left Ear Cup Assembly Group */}
            <group position={[-0.37, 0.31, 0]}>
              <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.085, 0.085, 0.035, 16]} />
                <meshStandardMaterial color="#22222a" roughness={0.15} metalness={0.9} />
              </mesh>
              <mesh castShadow rotation={[0, 0, Math.PI / 2]} position={[0.028, 0, 0]}>
                <cylinderGeometry args={[0.087, 0.087, 0.03, 16]} />
                <meshStandardMaterial color="#0a0a0f" roughness={0.8} metalness={0.1} />
              </mesh>
              <mesh ref={headphoneLeftRingRef} castShadow rotation={[0, Math.PI / 2, 0]} position={[-0.018, 0, 0]}>
                <torusGeometry args={[0.055, 0.01, 8, 16]} />
                <meshStandardMaterial color={cosmetics.headphonesColor ?? player.color} emissive={cosmetics.headphonesColor ?? player.color} emissiveIntensity={3.0} roughness={0.1} />
              </mesh>
              <mesh ref={headphoneLeftDotRef} castShadow rotation={[0, 0, Math.PI / 2]} position={[-0.02, 0, 0]}>
                <cylinderGeometry args={[0.024, 0.024, 0.008, 8]} />
                <meshStandardMaterial color={cosmetics.headphonesColor ?? player.color} emissive={cosmetics.headphonesColor ?? player.color} emissiveIntensity={3.0} roughness={0.1} />
              </mesh>
            </group>

            {/* Right Ear Cup Assembly Group */}
            <group position={[0.37, 0.31, 0]}>
              <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.085, 0.085, 0.035, 16]} />
                <meshStandardMaterial color="#22222a" roughness={0.15} metalness={0.9} />
              </mesh>
              <mesh castShadow rotation={[0, 0, Math.PI / 2]} position={[-0.028, 0, 0]}>
                <cylinderGeometry args={[0.087, 0.087, 0.03, 16]} />
                <meshStandardMaterial color="#0a0a0f" roughness={0.8} metalness={0.1} />
              </mesh>
              <mesh ref={headphoneRightRingRef} castShadow rotation={[0, Math.PI / 2, 0]} position={[0.018, 0, 0]}>
                <torusGeometry args={[0.055, 0.01, 8, 16]} />
                <meshStandardMaterial color={cosmetics.headphonesColor ?? player.color} emissive={cosmetics.headphonesColor ?? player.color} emissiveIntensity={3.0} roughness={0.1} />
              </mesh>
              <mesh ref={headphoneRightDotRef} castShadow rotation={[0, 0, Math.PI / 2]} position={[0.02, 0, 0]}>
                <cylinderGeometry args={[0.024, 0.024, 0.008, 8]} />
                <meshStandardMaterial color={cosmetics.headphonesColor ?? player.color} emissive={cosmetics.headphonesColor ?? player.color} emissiveIntensity={3.0} roughness={0.1} />
              </mesh>
            </group>
          </group>
        )}

        {/* Declarative Procedural Cyber-Backpack */}
        {player.isAlive && cosmetics.backpackEnabled && (
          <group ref={backpackRef}>
            <group position={[0, 0.28, 0.125]}>
              {/* A. Main Chassis */}
              <mesh castShadow receiveShadow position={[0, 0, 0.04]}>
                <boxGeometry args={[0.2, 0.28, 0.08]} />
                <meshStandardMaterial color="#16161c" roughness={0.18} metalness={0.8} />
              </mesh>

              {/* B. Glowing LED Indicators */}
              <mesh ref={led1Ref} position={[0, 0.08, 0.081]} castShadow>
                <boxGeometry args={[0.12, 0.024, 0.015]} />
                <meshStandardMaterial color={cosmetics.backpackColor ?? player.color} emissive={cosmetics.backpackColor ?? player.color} emissiveIntensity={3.0} roughness={0.1} />
              </mesh>
              <mesh ref={led2Ref} position={[0, 0, 0.081]} castShadow>
                <boxGeometry args={[0.12, 0.024, 0.015]} />
                <meshStandardMaterial color="#00f3ff" emissive="#00f3ff" emissiveIntensity={3.0} roughness={0.1} />
              </mesh>
              <mesh ref={led3Ref} position={[0, -0.08, 0.081]} castShadow>
                <boxGeometry args={[0.12, 0.024, 0.015]} />
                <meshStandardMaterial color="#ff007f" emissive="#ff007f" emissiveIntensity={3.0} roughness={0.1} />
              </mesh>

              {/* C. Dual Exhaust Thrusters */}
              {/* Left Thruster */}
              <group position={[-0.06, -0.14, 0.04]} rotation={[0.3, 0, 0.15]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.018, 0.024, 0.06, 8]} />
                  <meshStandardMaterial color="#3a3b46" roughness={0.2} metalness={0.9} />
                </mesh>
                <mesh ref={leftNozzleRef} position={[0, -0.026, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.01, 8]} />
                  <meshStandardMaterial color={cosmetics.backpackColor ?? player.color} emissive={cosmetics.backpackColor ?? player.color} emissiveIntensity={4.0} roughness={0.1} />
                </mesh>
              </group>

              {/* Right Thruster */}
              <group position={[0.06, -0.14, 0.04]} rotation={[0.3, 0, -0.15]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.018, 0.024, 0.06, 8]} />
                  <meshStandardMaterial color="#3a3b46" roughness={0.2} metalness={0.9} />
                </mesh>
                <mesh ref={rightNozzleRef} position={[0, -0.026, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.01, 8]} />
                  <meshStandardMaterial color={cosmetics.backpackColor ?? player.color} emissive={cosmetics.backpackColor ?? player.color} emissiveIntensity={4.0} roughness={0.1} />
                </mesh>
              </group>
            </group>
          </group>
        )}
      </group>

      {/* Floating Retro Cyber Companion Accessory */}
      {player.isAlive && companionType !== 'none' && (
        <group ref={companionRef}>
          {companionType === 'cassette' && (
            <group>
              {/* Cassette Main Body */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.3, 0.2, 0.06]} />
                <meshStandardMaterial 
                  color="#4b4e6d" // Elegant retro dark slate-blue plastic, highly visible
                  roughness={0.55} // Diffuse plastic reflection
                  metalness={0.05} // Non-metallic matte plastic
                />
              </mesh>
              {/* Tape Label (Central stripe) */}
              <mesh position={[0, 0, 0.031]} castShadow>
                <boxGeometry args={[0.2, 0.08, 0.005]} />
                <meshStandardMaterial 
                  color={cosmetics.companionColor ?? player.color} 
                  emissive={cosmetics.companionColor ?? player.color}
                  emissiveIntensity={2.5}
                />
              </mesh>
              {/* Left Tape Reel */}
              <mesh ref={leftReelRef} position={[-0.06, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 0.062, 8]} />
                <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.4} />
              </mesh>
              {/* Right Tape Reel */}
              <mesh ref={rightReelRef} position={[0.06, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 0.062, 8]} />
                <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.4} />
              </mesh>
            </group>
          )}

          {companionType === 'floppy' && (
            <group>
              {/* Main Floppy Shell */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.26, 0.26, 0.03]} />
                <meshStandardMaterial 
                  color="#383b52" // Gorgeous retro violet slate-blue plastic, highly visible
                  roughness={0.5} // Diffuse plastic reflection
                  metalness={0.05} // Non-metallic matte plastic
                />
              </mesh>
              {/* Metal Shutter (slides horizontally on beat pulse) */}
              <mesh ref={shutterRef} position={[0.05, -0.07, 0]} castShadow>
                <boxGeometry args={[0.09, 0.1, 0.032]} />
                <meshStandardMaterial 
                  color="#cccccc" 
                  metalness={0.5} 
                  roughness={0.35} 
                />
              </mesh>
              {/* Glowing Sticker Label */}
              <mesh position={[0, 0.04, 0.016]} castShadow>
                <boxGeometry args={[0.18, 0.12, 0.005]} />
                <meshStandardMaterial 
                  color={cosmetics.companionColor ?? player.color} 
                  emissive={cosmetics.companionColor ?? player.color}
                  emissiveIntensity={2.5}
                />
              </mesh>
              {/* Small Write-Protect Tab Hole */}
              <mesh position={[-0.09, -0.09, 0]} castShadow>
                <boxGeometry args={[0.03, 0.03, 0.035]} />
                <meshStandardMaterial color="#000000" roughness={1.0} />
              </mesh>
            </group>
          )}

          {companionType === 'orb' && (
            <group>
              {/* Central Core Energy Sphere */}
              <mesh ref={orbCoreRef} castShadow>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial 
                  color={cosmetics.companionColor ?? player.color} 
                  emissive={cosmetics.companionColor ?? player.color}
                  emissiveIntensity={4.0}
                />
              </mesh>
              {/* Outer Cyber Torus Rings */}
              <group rotation={[0, 0, Math.PI / 4]}>
                <mesh castShadow>
                  <torusGeometry args={[0.15, 0.018, 8, 24]} />
                  <meshStandardMaterial 
                    color="#00f3ff" 
                    emissive="#00f3ff"
                    emissiveIntensity={2.0}
                    metalness={0.8}
                    roughness={0.1}
                  />
                </mesh>
              </group>
              <group rotation={[Math.PI / 2, Math.PI / 4, 0]}>
                <mesh castShadow>
                  <torusGeometry args={[0.18, 0.012, 8, 24]} />
                  <meshStandardMaterial 
                    color="#ff007f" 
                    emissive="#ff007f"
                    emissiveIntensity={2.0}
                    metalness={0.8}
                    roughness={0.1}
                  />
                </mesh>
              </group>
            </group>
          )}
        </group>
      )}

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

useGLTF.preload('/models/player.glb?v=5');

