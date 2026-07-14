'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/src/stores/gameStore';
import { LOBBY_SONGS, DANCE_SONGS, WINNER_SONGS } from '@/src/hooks/useAudio';
import { BLOCK_SIZE } from '@/src/lib/constants';
import { GRID_SIZE, BlockColor } from '@/src/shared/types';

// Cyberpunk Stage Color Palette
const SPOTLIGHT_COLORS = ['#00f0ff', '#ff00ff', '#8b00ff', '#00ff66', '#ffea00'];
const LASER_COLORS = ['#ff0055', '#00ffcc', '#0066ff', '#cc00ff'];

const COLOR_HEX: Record<BlockColor, string> = {
  RED: '#ff3b30',
  BLUE: '#007aff',
  GREEN: '#34c759',
  YELLOW: '#ffcc00',
  PURPLE: '#af52de',
  ORANGE: '#ff9500',
  PINK: '#ff2d55',
  CYAN: '#5ac8fa',
  LIME: '#4cd964',
  WHITE: '#ffffff',
};

// ---------------------------------------------------------------------------
//  Custom Volumetric Beam Shader Material
//  Creates a cylinder beam that fades exponentially with height (soft projection)
//  and fades out near the edges for a natural volumetric glow.
// ---------------------------------------------------------------------------
const VolumetricShader = {
  uniforms: {
    color: { value: new THREE.Color('#00f0ff') },
    opacity: { value: 0.12 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying float vDepth;
    void main() {
      vUv = uv;
      vec4 localPos = vec4(position, 1.0);
      vDepth = localPos.y; // tracks height along cylinder length (-6.0 to +6.0)
      gl_Position = projectionMatrix * modelViewMatrix * localPos;
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying float vDepth;
    void main() {
      // Scale vDepth (which runs from -6.0 to 6.0) to a 0.0 - 1.0 gradient
      // Top of light source is at +6.0, projection floor is at -6.0.
      float factor = (vDepth + 6.0) / 12.0;
      factor = clamp(factor, 0.0, 1.0);
      
      // Exponential decay to simulate attenuation in fog
      float glow = pow(factor, 2.5);
      
      // Soft circular envelope (fade at cylinder borders)
      float edgeFade = sin(vUv.x * 3.14159);
      
      gl_FragColor = vec4(color, glow * edgeFade * opacity);
    }
  `,
};

// ---------------------------------------------------------------------------
//  Single Volumetric Spotlight Component
// ---------------------------------------------------------------------------
interface SpotlightProps {
  position: [number, number, number];
  colorIndex: number;
  orbitIndex: number;
  showStateRef: React.MutableRefObject<{ beatPulse: number; activeBpm: number }>;
  winnerColorHex: string | null;
}

function Spotlight({ position, colorIndex, orbitIndex, showStateRef, winnerColorHex }: SpotlightProps) {
  const casingRef = useRef<THREE.Group>(null);
  const droneGroupRef = useRef<THREE.Group>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const beamMatRef = useRef<THREE.ShaderMaterial>(null);

  // Create stable material instances to be shared across meshes using useMemo
  const accentMaterial = useMemo(() => new THREE.MeshBasicMaterial(), []);
  const lensMaterial = useMemo(() => new THREE.MeshBasicMaterial(), []);

  // Store materials in refs to satisfy ESLint's strict immutability checks in useFrame
  const accentMatRef = useRef(accentMaterial);
  const lensMatRef = useRef(lensMaterial);

  // Dynamic sweeping targets for lookAt stored in a mutable ref to satisfy ESLint
  const targetPosRef = useRef(new THREE.Vector3());

  // Volumetric material setup
  const volumetricMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(VolumetricShader.uniforms),
      vertexShader: VolumetricShader.vertexShader,
      fragmentShader: VolumetricShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, []);

  // Connect spotlight to its target on mount and cleanup materials on unmount
  useEffect(() => {
    if (spotLightRef.current && targetRef.current) {
      spotLightRef.current.target = targetRef.current;
    }
    return () => {
      accentMaterial.dispose();
      lensMaterial.dispose();
      volumetricMaterial.dispose();
    };
  }, [accentMaterial, lensMaterial, volumetricMaterial]);

  // Update position targets, colors, and intensities in the R3F loop
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const { activeBpm, beatPulse } = showStateRef.current;
    const speed = (activeBpm / 60) * 0.4; // sync sweep frequency to BPM

    // Animate target points with diverse paths based on index
    let tx = 0;
    let tz = 0;

    if (orbitIndex === 0) {
      tx = Math.sin(time * speed * 1.5) * 5.0;
      tz = Math.cos(time * speed * 1.1) * 5.0;
    } else if (orbitIndex === 1) {
      tx = Math.cos(time * speed * 1.2) * 5.5;
      tz = Math.sin(time * speed * 1.6) * 5.5;
    } else if (orbitIndex === 2) {
      tx = Math.sin(time * speed * 0.9) * 4.5;
      tz = Math.sin(time * speed * 1.4) * 4.5;
    } else {
      tx = Math.cos(time * speed * 1.4) * 6.0;
      tz = Math.cos(time * speed * 0.8) * 6.0;
    }

    targetPosRef.current.set(tx, 0, tz);

    if (casingRef.current) {
      casingRef.current.lookAt(targetPosRef.current);
    }

    // Animate the floating/bobbing of the drone body in the air
    if (droneGroupRef.current) {
      // Organic sinusoidal bobbing up and down
      const bobFreq = 1.8;
      const bobAmp = 0.16;
      droneGroupRef.current.position.y = Math.sin(time * bobFreq + orbitIndex * 1.5) * bobAmp;

      // Subtle mechanical stabilization tilts (X and Z axis)
      droneGroupRef.current.rotation.x = Math.cos(time * 1.2 + orbitIndex) * 0.04;
      droneGroupRef.current.rotation.z = Math.sin(time * 1.0 + orbitIndex) * 0.04;
    }

    // Determine color: follow winner color if announced, else sweep palette
    let activeColor = SPOTLIGHT_COLORS[(colorIndex + Math.floor(time * 0.25)) % SPOTLIGHT_COLORS.length];
    if (winnerColorHex) {
      activeColor = winnerColorHex;
    }

    const threeColor = new THREE.Color(activeColor);

    // Update light and shader uniforms
    if (spotLightRef.current) {
      spotLightRef.current.color.copy(threeColor);
      // Dynamic pulse intensity synced to the beat
      spotLightRef.current.intensity = 15.0 + beatPulse * 45.0;
    }

    // Access and mutate shader properties using the ref to avoid local scope warnings
    if (beamMatRef.current) {
      beamMatRef.current.uniforms.color.value.copy(threeColor);
      beamMatRef.current.uniforms.opacity.value = 0.08 + beatPulse * 0.22;
    }

    // Sync glowing camera-style lens to the beat
    if (lensMatRef.current) {
      lensMatRef.current.color.copy(threeColor).multiplyScalar(4.0 + beatPulse * 8.0);
    }

    // Sync side cyberpunk stripes, thrusters and hover rings to the beat
    if (accentMatRef.current) {
      accentMatRef.current.color.copy(threeColor).multiplyScalar(2.0 + beatPulse * 4.0);
    }
  });

  return (
    <group position={position}>
      {/* Floating Hover Drone Body (encapsulated for bobbing and tilting animations) */}
      <group ref={droneGroupRef}>

        {/* 1. OUTER STABILIZING HOVER RING (Glows and pulses to the beat) */}
        <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} material={accentMaterial}>
          <torusGeometry args={[0.48, 0.035, 8, 32]} />
        </mesh>

        {/* 2. CORE CHASSIS (Dark metallic shell housing the processors) */}
        <mesh position={[0, 0.08, 0]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color="#1a1a24" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Upper Navigation Dome / Cap on top of chassis */}
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.06, 12]} />
          <meshStandardMaterial color="#2c2c3b" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* 3. STRUCTURAL SPOKES (Connects chassis to outer hover ring) */}
        {/* Left-Right strut */}
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.92, 0.02, 0.04]} />
          <meshStandardMaterial color="#2c2c3b" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Front-Back strut */}
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.04, 0.02, 0.92]} />
          <meshStandardMaterial color="#2c2c3b" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* 4. 4x DOWNWARD ANTI-GRAVITY PLASMA JETS / THRUSTERS */}
        {/* Thruster 1: Left */}
        <group position={[-0.34, 0.08, 0]}>
          {/* Nozzle */}
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.03, 0.045, 0.07, 8]} />
            <meshStandardMaterial color="#2c2c3b" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Glowing Plasma Trail (Pulsates to the beat) */}
          <mesh position={[0, -0.13, 0]} material={accentMaterial}>
            <cylinderGeometry args={[0.015, 0.002, 0.12, 6, 1, true]} />
          </mesh>
        </group>

        {/* Thruster 2: Right */}
        <group position={[0.34, 0.08, 0]}>
          {/* Nozzle */}
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.03, 0.045, 0.07, 8]} />
            <meshStandardMaterial color="#2c2c3b" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Glowing Plasma Trail */}
          <mesh position={[0, -0.13, 0]} material={accentMaterial}>
            <cylinderGeometry args={[0.015, 0.002, 0.12, 6, 1, true]} />
          </mesh>
        </group>

        {/* Thruster 3: Front */}
        <group position={[0, 0.08, 0.34]}>
          {/* Nozzle */}
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.03, 0.045, 0.07, 8]} />
            <meshStandardMaterial color="#2c2c3b" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Glowing Plasma Trail */}
          <mesh position={[0, -0.13, 0]} material={accentMaterial}>
            <cylinderGeometry args={[0.015, 0.002, 0.12, 6, 1, true]} />
          </mesh>
        </group>

        {/* Thruster 4: Back */}
        <group position={[0, 0.08, -0.34]}>
          {/* Nozzle */}
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.03, 0.045, 0.07, 8]} />
            <meshStandardMaterial color="#2c2c3b" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Glowing Plasma Trail */}
          <mesh position={[0, -0.13, 0]} material={accentMaterial}>
            <cylinderGeometry args={[0.015, 0.002, 0.12, 6, 1, true]} />
          </mesh>
        </group>

        {/* 5. GIMBAL / ROTATING JOINT SPHERE */}
        <mesh position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshStandardMaterial color="#38384a" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* 6. ROBOTIC BRACKET ARMS (Suspends head underneath joint) */}
        <mesh position={[-0.20, -0.20, 0]}>
          <boxGeometry args={[0.04, 0.24, 0.08]} />
          <meshStandardMaterial color="#1a1a24" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0.20, -0.20, 0]}>
          <boxGeometry args={[0.04, 0.24, 0.08]} />
          <meshStandardMaterial color="#1a1a24" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* 7. ARTICULATED CASING HEAD (Pivots to track active target) */}
        <group ref={casingRef} position={[0, -0.20, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.17, 0.38, 16]} />
            <meshStandardMaterial color="#2c2c3b" metalness={0.95} roughness={0.12} />
          </mesh>

          {/* Cyber Neon Accent Stripes wrapping the head */}
          <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]} material={accentMaterial}>
            <torusGeometry args={[0.155, 0.015, 8, 24]} />
          </mesh>
          <mesh position={[0, 0, -0.09]} rotation={[Math.PI / 2, 0, 0]} material={accentMaterial}>
            <torusGeometry args={[0.148, 0.015, 8, 24]} />
          </mesh>

          {/* Projector Lens / Glowing Aperture Core */}
          <mesh position={[0, 0, -0.191]} rotation={[0, 0, 0]} material={lensMaterial}>
            <circleGeometry args={[0.11, 16]} />
          </mesh>

          {/* Real Spotlight Light Projection */}
          <spotLight
            ref={spotLightRef}
            position={[0, 0, -0.16]}
            angle={0.4}
            penumbra={0.65}
            distance={26}
          />

          {/* Volumetric Glowing Beam Mesh */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -6.1]}>
            <cylinderGeometry args={[0.08, 1.8, 12, 24, 4, true]} />
            <primitive object={volumetricMaterial} attach="material" ref={beamMatRef} />
          </mesh>

          {/* Casing Target Anchor */}
          <object3D ref={targetRef} position={[0, 0, -1]} />
        </group>

      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
//  Single Retro Stage Laser Component
// ---------------------------------------------------------------------------
interface LaserProps {
  origin: [number, number, number];
  colorIndex: number;
  sweepIndex: number;
  showStateRef: React.MutableRefObject<{ beatPulse: number; activeBpm: number }>;
  winnerColorHex: string | null;
}

function StageLaser({ origin, colorIndex, sweepIndex, showStateRef, winnerColorHex }: LaserProps) {
  const casingRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const laserDiodeMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const laserAccentMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const targetPosRef = useRef(new THREE.Vector3());

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const { activeBpm, beatPulse } = showStateRef.current;
    const speed = (activeBpm / 60) * 0.45;

    // Sweeping targets across the arena
    let tx = 0;
    let tz = 0;

    if (sweepIndex === 0) {
      tx = Math.sin(time * speed * 0.8) * 6.5;
      tz = Math.cos(time * speed * 0.9) * 6.5;
    } else if (sweepIndex === 1) {
      tx = Math.cos(time * speed * 0.75) * 6.5;
      tz = Math.sin(time * speed * 1.1) * 6.5;
    } else if (sweepIndex === 2) {
      tx = Math.sin(time * speed * 1.25) * 6.5;
      tz = Math.cos(time * speed * 0.7) * 6.5;
    } else {
      tx = Math.cos(time * speed * 1.05) * 6.5;
      tz = Math.sin(time * speed * 0.85) * 6.5;
    }

    // Target slightly below head level to prevent face clipping
    targetPosRef.current.set(tx, 2.5, tz);

    if (casingRef.current) {
      casingRef.current.lookAt(targetPosRef.current);
    }

    // Sync colors to winner or sequence
    let color = LASER_COLORS[(colorIndex + Math.floor(time * 0.35)) % LASER_COLORS.length];
    if (winnerColorHex) {
      color = winnerColorHex;
    }

    const baseColor = new THREE.Color(color);

    // Sync main laser line
    if (matRef.current) {
      // Extremely high emissive multiplication to force Bloom glow!
      matRef.current.color.copy(baseColor).multiplyScalar(8.0 + beatPulse * 16.0);
      matRef.current.opacity = 0.3 + beatPulse * 0.7;
    }

    // Sync diode glow
    if (laserDiodeMatRef.current) {
      laserDiodeMatRef.current.color.copy(baseColor).multiplyScalar(12.0 + beatPulse * 24.0);
    }

    // Sync status band glow
    if (laserAccentMatRef.current) {
      laserAccentMatRef.current.color.copy(baseColor).multiplyScalar(2.5 + beatPulse * 5.0);
    }
  });

  return (
    <group position={origin}>
      {/* Sleek support mounting base block */}
      <mesh>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshStandardMaterial color="#2d2d3a" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Articulated Laser Pointer Shell */}
      <group ref={casingRef} position={[0, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.25, 8]} />
          <meshStandardMaterial color="#38384a" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Status Neon Accent Band around emitter */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <torusGeometry args={[0.095, 0.015, 6, 12]} />
          <meshBasicMaterial ref={laserAccentMatRef} />
        </mesh>

        {/* Burning neon diode crystal at tip */}
        <mesh position={[0, 0, -0.13]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial ref={laserDiodeMatRef} />
        </mesh>

        {/* Thin, ultra-bright laser cylinder */}
        {/* Extends 24 units along parent Z axis */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -12]}>
          <cylinderGeometry args={[0.015, 0.015, 24, 6, 1, true]} />
          <meshBasicMaterial
            ref={matRef}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
//  StageShow Component — Unified Stage Lights & Lasers Show
// ---------------------------------------------------------------------------
export function StageShow() {
  // High-performance selective state selections to avoid massive unnecessary renders
  const phase = useGameStore((s) => s.gameState?.phase || 'LOBBY');
  const winnerColor = useGameStore((s) => s.gameState?.winnerColor || null);
  const timeLeft = useGameStore((s) => s.gameState?.timeLeft ?? 0);
  const roomId = useGameStore((s) => s.room?.id) || 'DEFAULT';
  const gameSpeed = useGameStore((s) => s.room?.settings?.gameSpeed || 'NORMAL');

  const halfGrid = (GRID_SIZE / 2 - 0.5) * BLOCK_SIZE;
  const stageEdge = halfGrid * 1.35; // Spotlight mounts placed slightly outside grid
  const laserEdge = halfGrid * 1.25;

  const isUrgent = timeLeft <= 3 && phase === 'ANNOUNCING';

  const winnerColorHex = useMemo(() => {
    if (isUrgent) {
      return '#f43f5e'; // Red alert countdown pulse
    }
    if (winnerColor) {
      return COLOR_HEX[winnerColor] || '#ffffff';
    }
    return null;
  }, [winnerColor, isUrgent]);

  // Point light for localized beat sync flashes
  const flashColor = useMemo(() => {
    if (winnerColorHex) return winnerColorHex;
    return phase === 'LOBBY' ? '#ff00ff' : '#00ffff';
  }, [winnerColorHex, phase]);

  // Spotlight mount coordinates (height Y = 7.0, lowered slightly as requested for better volumetric closeness)
  const spotlightPositions: [number, number, number][] = useMemo(() => [
    [-stageEdge, 5.0, -stageEdge],
    [stageEdge, 5.0, -stageEdge],
    [-stageEdge, 5.0, stageEdge],
    [stageEdge, 5.0, stageEdge],
  ], [stageEdge]);

  // Laser emitter coordinates (placed at Y = 2.9, just above standard block levels)
  const laserPositions: [number, number, number][] = useMemo(() => [
    [-laserEdge, 2.0, -laserEdge],
    [laserEdge, 2.0, -laserEdge],
    [-laserEdge, 2.0, laserEdge],
    [laserEdge, 2.0, laserEdge],
  ], [laserEdge]);

  // Calculate global active BPM and seekTime in the frame loop (matching BlockGrid & PlayerMesh)
  const showState = useRef({ beatPulse: 0, activeBpm: 120 });
  const pointLightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    let activeBpm = 120; // default safe fallback

    // Detect BPM dynamically based on active audio track playing status
    if (typeof window !== 'undefined') {
      const lobbyPlaying = LOBBY_SONGS.some(t => t.playing());
      const winnerPlaying = WINNER_SONGS.some(t => t.playing());
      
      if (lobbyPlaying) {
        activeBpm = 110;
      } else if (winnerPlaying) {
        activeBpm = 115;
      } else {
        const DANCE_BPMS = [128, 135, 142, 130, 128, 135, 140, 142, 132, 128];
        for (let i = 0; i < DANCE_SONGS.length; i++) {
          if (DANCE_SONGS[i].playing()) {
            activeBpm = DANCE_BPMS[i];
            break;
          }
        }
      }
    }

    // If Howler is not reporting track.playing() (due to autoplay/loading delays), deduce active BPM by game status
    const isLobby = phase === 'LOBBY';
    const isPlayingGame = phase === 'STARTING' || phase === 'DANCING' || phase === 'ANNOUNCING';

    if (activeBpm === 120) {
      if (isLobby) {
        activeBpm = 110;
      } else if (isPlayingGame) {
        let trackIndex = 0;
        if (gameSpeed === 'TURBO') {
          trackIndex = (roomId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 2) + 1;
        } else {
          trackIndex = (roomId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 3);
        }
        const BPM_DANCE = [128, 135, 142];
        activeBpm = BPM_DANCE[trackIndex];
      }
    }

    // Always use Three.js clock as the authoritative source of time to avoid Howler seek freeze/restart bugs!
    const seekTime = state.clock.elapsedTime;

    let beatPulse = 0;
    if (activeBpm > 0) {
      const elapsedBeats = seekTime * (activeBpm / 60);
      const beatProgress = elapsedBeats % 1;
      beatPulse = Math.pow(1 - beatProgress, 4); // exponential decay pulse
    }

    showState.current = { beatPulse, activeBpm };

    // Imperatively flash the point light centered over the stage on the beat pulse
    if (pointLightRef.current) {
      pointLightRef.current.intensity = beatPulse * 9.6; // double intensity for extra pop!
      pointLightRef.current.color.set(flashColor);
    }
  });

  return (
    <group>
      {/* 4 Corner Spotlights */}
      {spotlightPositions.map((pos, i) => (
        <Spotlight
          key={`spot-${i}`}
          position={pos}
          colorIndex={i}
          orbitIndex={i}
          showStateRef={showState}
          winnerColorHex={winnerColorHex}
        />
      ))}

      {/* 4 Criss-Crossing Lasers above floor */}
      {laserPositions.map((pos, i) => (
        <StageLaser
          key={`laser-${i}`}
          origin={pos}
          colorIndex={i}
          sweepIndex={i}
          showStateRef={showState}
          winnerColorHex={winnerColorHex}
        />
      ))}

      {/* Dynamic Beat-Flash Point Light (centered at Y = 4.0) */}
      <pointLight
        ref={pointLightRef}
        position={[0, 4.0, 0]}
        intensity={0}
        distance={25}
        color={flashColor}
        decay={1.6}
      />
    </group>
  );
}
