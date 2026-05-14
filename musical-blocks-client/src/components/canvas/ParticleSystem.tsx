'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
//  Types and Event definitions
// ---------------------------------------------------------------------------
export type ParticleType = 'burst' | 'dust' | 'confetti';

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
const MAX_PARTICLES = 1000;

// ---------------------------------------------------------------------------
//  Particle System Core (Vanilla Singleton)
//  We define this outside the component to completely bypass the React Compiler.
//  Since this is a singleton in our app, this is safe and much more performant.
// ---------------------------------------------------------------------------
const particleData = {
  positions: new Float32Array(MAX_PARTICLES * 3),
  colors: new Float32Array(MAX_PARTICLES * 3),
  velocities: new Float32Array(MAX_PARTICLES * 3),
  lifetimes: new Float32Array(MAX_PARTICLES), // 0 means inactive
  maxLifetimes: new Float32Array(MAX_PARTICLES),
  types: new Int32Array(MAX_PARTICLES), // 0: burst, 1: dust, 2: confetti
};

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(particleData.colors, 3));

const material = new THREE.PointsMaterial({
  size: 0.25,
  vertexColors: true,
  transparent: true,
  opacity: 0.8,
  sizeAttenuation: true,
});

export function ParticleSystem() {
  const pointsRef = useRef<THREE.Points>(null);

  // Event listener to add particles
  useEffect(() => {
    const handleSpawn = (e: Event) => {
      const { x, y, z, color, count, type } = (e as CustomEvent<SpawnParticlesEvent>).detail;
      const typeCode = type === 'burst' ? 0 : type === 'dust' ? 1 : 2;
      const c = new THREE.Color(color);
      
      let spawned = 0;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (particleData.lifetimes[i] <= 0) { // Found inactive slot
          // Set Position
          particleData.positions[i * 3] = x + (Math.random() - 0.5);
          particleData.positions[i * 3 + 1] = y + (Math.random() - 0.5);
          particleData.positions[i * 3 + 2] = z + (Math.random() - 0.5);
          
          // Set Color
          particleData.colors[i * 3] = c.r;
          particleData.colors[i * 3 + 1] = c.g;
          particleData.colors[i * 3 + 2] = c.b;
          
          // Set Velocity & Life based on type
          if (type === 'burst') {
            particleData.velocities[i * 3] = (Math.random() - 0.5) * 8;
            particleData.velocities[i * 3 + 1] = Math.random() * 8 + 2;
            particleData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 8;
            particleData.lifetimes[i] = Math.random() * 0.5 + 0.5;
          } else if (type === 'dust') {
            particleData.velocities[i * 3] = (Math.random() - 0.5) * 4;
            particleData.velocities[i * 3 + 1] = Math.random() * 2 + 0.5;
            particleData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 4;
            particleData.lifetimes[i] = Math.random() * 0.4 + 0.3;
          } else if (type === 'confetti') {
            particleData.velocities[i * 3] = (Math.random() - 0.5) * 6;
            particleData.velocities[i * 3 + 1] = (Math.random() - 0.5) * 2 - 2; // falling
            particleData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 6;
            particleData.lifetimes[i] = Math.random() * 2.0 + 1.0;
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
        } else if (typeCode === 1) { // dust
          particleData.velocities[i * 3 + 1] -= 5 * delta;
        } else if (typeCode === 2) { // confetti
          particleData.velocities[i * 3 + 1] -= 2 * delta; // slow fall
          // Fluttering effect for confetti
          particleData.velocities[i * 3] += (Math.random() - 0.5) * 10 * delta;
          particleData.velocities[i * 3 + 2] += (Math.random() - 0.5) * 10 * delta;
        }

        // Fade out color (alpha simulation by blending to black or shrinking if custom shader, 
        // but here we just leave it and let it vanish abruptly when life ends, or we could darken it).
        
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
