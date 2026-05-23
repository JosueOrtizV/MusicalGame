'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
//  Types and Event definitions
// ---------------------------------------------------------------------------
export type ParticleType = 'burst' | 'dust' | 'confetti' | 'voxel_burst';

export interface SpawnParticlesEvent {
  x: number;
  y: number;
  z: number;
  color: string;
  count: number;
  type: ParticleType;
}

// Global helper to spawn particles from anywhere
export const spawnParticles = (detail: SpawnParticlesEvent) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spawn-particles', { detail }));
  }
};

// ---------------------------------------------------------------------------
//  Particle System Component
// ---------------------------------------------------------------------------
const MAX_PARTICLES = 3000;

// ---------------------------------------------------------------------------
//  Particle System Core (Vanilla Singleton)
//  We define this outside the component to completely bypass the React Compiler.
//  Since this is a singleton in our app, this is safe and much more performant.
// ---------------------------------------------------------------------------
const particleData = {
  positions: new Float32Array(MAX_PARTICLES * 3),
  colors: new Float32Array(MAX_PARTICLES * 3),
  initialColors: new Float32Array(MAX_PARTICLES * 3), // Store initial color for fading!
  velocities: new Float32Array(MAX_PARTICLES * 3),
  lifetimes: new Float32Array(MAX_PARTICLES), // 0 means inactive
  maxLifetimes: new Float32Array(MAX_PARTICLES),
  types: new Int32Array(MAX_PARTICLES), // 0: burst, 1: dust, 2: confetti
};

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(particleData.colors, 3));

const material = new THREE.PointsMaterial({
  size: 0.4,
  vertexColors: true,
  transparent: true,
  opacity: 1.0,
  sizeAttenuation: true,
  blending: THREE.AdditiveBlending, // Additive = glowing neon effect
  depthWrite: false,
});

export function ParticleSystem() {
  const pointsRef = useRef<THREE.Points>(null);

  // Event listener to add particles
  useEffect(() => {
    const handleSpawn = (e: Event) => {
      const { x, y, z, color, count, type } = (e as CustomEvent<SpawnParticlesEvent>).detail;
      const typeCode = type === 'burst' ? 0 : type === 'dust' ? 1 : type === 'confetti' ? 2 : 3;
      const c = new THREE.Color(color);
      
      let spawned = 0;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (particleData.lifetimes[i] <= 0) { // Found inactive slot
          // Set Position
          if (type === 'dust') {
            const gridSpacing = 0.1;
            // Snap to grid for retro digital grid style
            particleData.positions[i * 3] = Math.round(x / gridSpacing) * gridSpacing;
            particleData.positions[i * 3 + 1] = Math.round(y / gridSpacing) * gridSpacing;
            particleData.positions[i * 3 + 2] = Math.round(z / gridSpacing) * gridSpacing;
          } else {
            particleData.positions[i * 3] = x + (Math.random() - 0.5);
            particleData.positions[i * 3 + 1] = y + (Math.random() - 0.5);
            particleData.positions[i * 3 + 2] = z + (Math.random() - 0.5);
          }
          
          // Set Color — overbright for additive blending glow effect
          const brightFactor = type === 'burst' || type === 'voxel_burst' ? 3.0 : 1.5;
          const r = c.r * brightFactor;
          const g = c.g * brightFactor;
          const b = c.b * brightFactor;
          
          particleData.colors[i * 3] = r;
          particleData.colors[i * 3 + 1] = g;
          particleData.colors[i * 3 + 2] = b;
          
          particleData.initialColors[i * 3] = r;
          particleData.initialColors[i * 3 + 1] = g;
          particleData.initialColors[i * 3 + 2] = b;
          
          // Set Velocity & Life based on type
          if (type === 'burst') {
            particleData.velocities[i * 3] = (Math.random() - 0.5) * 12;
            particleData.velocities[i * 3 + 1] = Math.random() * 12 + 3;
            particleData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 12;
            particleData.lifetimes[i] = Math.random() * 0.6 + 0.5;
          } else if (type === 'dust') {
            // Digital grid footprint pixels: rise slowly upwards without spreading horizontally, fades in exactly 0.5s!
            particleData.velocities[i * 3] = 0;
            particleData.velocities[i * 3 + 1] = 0.4;
            particleData.velocities[i * 3 + 2] = 0;
            particleData.lifetimes[i] = 0.5;
          } else if (type === 'confetti') {
            particleData.velocities[i * 3] = (Math.random() - 0.5) * 8;
            particleData.velocities[i * 3 + 1] = (Math.random() - 0.5) * 2 - 2;
            particleData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 8;
            particleData.lifetimes[i] = Math.random() * 2.0 + 1.0;
          } else if (type === 'voxel_burst') {
            const angle = Math.random() * Math.PI * 2;
            const pitch = (Math.random() - 0.5) * Math.PI;
            const speed = 7.0 + Math.random() * 6.0;
            const vx = Math.cos(angle) * Math.cos(pitch);
            const vy = Math.sin(pitch);
            const vz = Math.sin(angle) * Math.cos(pitch);
            
            // Quantize directional vectors to discrete steps to align particles in distinct voxel grid lines!
            const steps = 3.5;
            particleData.velocities[i * 3] = Math.round(vx * steps) / steps * speed;
            particleData.velocities[i * 3 + 1] = Math.round(vy * steps) / steps * speed + 1.2; // slight upward push
            particleData.velocities[i * 3 + 2] = Math.round(vz * steps) / steps * speed;
            
            particleData.lifetimes[i] = Math.random() * 0.7 + 0.75;
          }
          
          particleData.maxLifetimes[i] = particleData.lifetimes[i];
          particleData.types[i] = typeCode;
          
          spawned++;
          if (spawned >= count) break;
        }
      }
    };

    window.addEventListener('spawn-particles', handleSpawn);
    return () => window.removeEventListener('spawn-particles', handleSpawn);
  }, []);

  // Update loop
  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    let needsUpdate = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (particleData.lifetimes[i] > 0) {
        particleData.lifetimes[i] -= delta;
        
        if (particleData.lifetimes[i] <= 0) {
          // Particle died: move far away
          particleData.positions[i * 3 + 1] = -999;
          needsUpdate = true;
          continue;
        }

        const typeCode = particleData.types[i];
        
        // Physics update
        particleData.positions[i * 3] += particleData.velocities[i * 3] * delta;
        particleData.positions[i * 3 + 1] += particleData.velocities[i * 3 + 1] * delta;
        particleData.positions[i * 3 + 2] += particleData.velocities[i * 3 + 2] * delta;

        // Gravity
        if (typeCode === 0) { // burst
          particleData.velocities[i * 3 + 1] -= 15 * delta; 
        } else if (typeCode === 3) { // voxel_burst (retro firework)
          particleData.velocities[i * 3 + 1] -= 5.0 * delta; // gentle retro falling gravity
        } else if (typeCode === 1) { // dust
          // No gravity: let footprint pixels rise straight up linearly
        } else if (typeCode === 2) { // confetti
          particleData.velocities[i * 3 + 1] -= 2 * delta; // slow fall
          // Fluttering effect for confetti
          particleData.velocities[i * 3] += (Math.random() - 0.5) * 10 * delta;
          particleData.velocities[i * 3 + 2] += (Math.random() - 0.5) * 10 * delta;
        }

        // Smooth fade out by multiplying with remaining life ratio
        const lifeRatio = Math.max(0, particleData.lifetimes[i] / particleData.maxLifetimes[i]);
        particleData.colors[i * 3] = particleData.initialColors[i * 3] * lifeRatio;
        particleData.colors[i * 3 + 1] = particleData.initialColors[i * 3 + 1] * lifeRatio;
        particleData.colors[i * 3 + 2] = particleData.initialColors[i * 3 + 2] * lifeRatio;
        
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef} args={[geometry, material]} frustumCulled={false} />
  );
}
