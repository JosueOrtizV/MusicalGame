# Musical Blocks — Plan de Implementación Técnico

## Descripción del Proyecto

Clon multijugador de "Block Party" (Minecraft) construido con Next.js 16 + React Three Fiber en el cliente, y un servidor autoritativo independiente con Fastify + Socket.io. Los jugadores bailan sobre una grilla vóxel de 12×12 bloques con colores. Cada ronda el servidor anuncia el color ganador; los bloques del color incorrecto se eliminan, y los jugadores que caen son eliminados. Las rondas se aceleran hasta que queda un ganador.

---

## Stack Tecnológico (Estado Actual)

| Capa | Tecnología | Estado |
|---|---|---|
| Cliente UI | Next.js 16 (App Router) + TypeScript | ✅ Instalado |
| Renderizado 3D | React Three Fiber v9 + Three.js v0.184 | ✅ Instalado |
| Helpers 3D | @react-three/drei v10 | ✅ Instalado |
| Estilos | Tailwind CSS v4 | ✅ Instalado |
| WS Cliente | socket.io-client v4 | ✅ Instalado |
| Servidor HTTP | Fastify v5 | ✅ Instalado |
| WS Servidor | Socket.io v4 | ✅ Instalado |
| Runtime TS | ts-node v10 | ✅ Instalado |
| TypeScript | v5 (cliente) / v6 (servidor) | ✅ Instalado |

> [!WARNING]
> El servidor tiene TypeScript v6 (pre-release). Se recomienda fijar a `^5.4.0` para estabilidad y compatibilidad con ts-node.

---

## Estructura de Carpetas del Monorepo

```
MusicalGame/
├── musical-blocks-client/          # Next.js App Router
│   ├── app/
│   │   ├── layout.tsx              # Root layout + providers
│   │   ├── page.tsx                # Landing / Lobby screen
│   │   ├── globals.css
│   │   └── game/
│   │       └── page.tsx            # Game screen (R3F Canvas)
│   ├── src/
│   │   ├── components/
│   │   │   ├── canvas/
│   │   │   │   ├── GameCanvas.tsx       # <Canvas> wrapper, camera, lighting
│   │   │   │   ├── BlockGrid.tsx        # InstancedMesh 12×12
│   │   │   │   ├── PlayerMesh.tsx       # Personaje vóxel por jugador
│   │   │   │   ├── FallingBlock.tsx     # Animación de caída
│   │   │   │   └── Skybox.tsx           # Ambiente
│   │   │   ├── hud/
│   │   │   │   ├── ColorIndicator.tsx   # Color ganador anunciado
│   │   │   │   ├── Timer.tsx            # Cuenta regresiva
│   │   │   │   ├── PlayerList.tsx       # Lista de jugadores vivos
│   │   │   │   └── RoundBanner.tsx      # "Round X — Survive!"
│   │   │   └── ui/
│   │   │       ├── LobbyScreen.tsx
│   │   │       ├── GameOverScreen.tsx
│   │   │       └── WinnerScreen.tsx
│   │   ├── hooks/
│   │   │   ├── useSocket.ts        # Conexión y eventos Socket.io
│   │   │   ├── useGameState.ts     # Estado global de la partida
│   │   │   ├── usePlayerInput.ts   # Teclado/touch → movimiento
│   │   │   └── useAudio.ts         # Web Audio API para música
│   │   ├── stores/
│   │   │   └── gameStore.ts        # Zustand — estado reactivo
│   │   ├── types/
│   │   │   └── index.ts            # Tipos compartidos (importados del shared/)
│   │   └── lib/
│   │       ├── socketClient.ts     # Singleton Socket.io
│   │       └── constants.ts        # GRID_SIZE, COLORS, etc.
│   └── public/
│       └── audio/                  # Música y SFX
│
├── musical-blocks-server/          # Fastify + Socket.io
│   ├── src/
│   │   ├── index.ts                # Entry point — Fastify server
│   │   ├── socket/
│   │   │   ├── handlers.ts         # Eventos Socket.io (join, move, etc.)
│   │   │   └── emitters.ts         # Helpers para emitir eventos
│   │   ├── game/
│   │   │   ├── GameRoom.ts         # Clase Room: estado, jugadores, ronda
│   │   │   ├── GameLoop.ts         # Loop autoritativo (setInterval/hrtime)
│   │   │   ├── GridManager.ts      # Estado de la grilla 12×12
│   │   │   ├── PlayerManager.ts    # Registro, movimiento, colisiones
│   │   │   └── RoundManager.ts     # Lógica de fases y color ganador
│   │   └── types/
│   │       └── index.ts            # Tipos compartidos del dominio
│   ├── tsconfig.json
│   └── package.json
│
└── shared/                         # Tipos e interfaces compartidos
    └── types.ts                    # GameState, Player, Block, Events
```

---

## Fase 1 — Fundamentos e Infraestructura (Semana 1)

### 1.1 Servidor: Tipos Compartidos y Configuración TS

**Objetivo**: Tener un servidor TypeScript funcional que acepte conexiones WebSocket.

```typescript
// shared/types.ts — Contrato cliente/servidor
export type BlockColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'PURPLE' | 'ORANGE';

export interface Player {
  id: string;
  name: string;
  position: { x: number; z: number }; // coordenadas en grilla
  isAlive: boolean;
  color: string;
}

export interface GameBlock {
  row: number;
  col: number;
  color: BlockColor;
  isActive: boolean;
}

export interface GameState {
  phase: 'LOBBY' | 'DANCING' | 'ANNOUNCING' | 'ELIMINATING' | 'ROUND_END' | 'GAME_OVER';
  round: number;
  timeLeft: number;      // segundos
  winnerColor: BlockColor | null;
  blocks: GameBlock[][];  // [row][col]
  players: Player[];
  winnerId: string | null;
}

// Eventos Server → Client
export type ServerEvents = {
  'game:state':      (state: GameState) => void;
  'game:round_start':(payload: { round: number; duration: number }) => void;
  'game:announce':   (payload: { winnerColor: BlockColor }) => void;
  'game:eliminate':  (payload: { eliminatedBlocks: {row:number;col:number}[] }) => void;
  'game:player_died':(payload: { playerId: string }) => void;
  'game:over':       (payload: { winnerId: string | null }) => void;
  'room:players':    (players: Player[]) => void;
};

// Eventos Client → Server
export type ClientEvents = {
  'player:join':  (payload: { name: string }) => void;
  'player:move':  (payload: { direction: 'UP'|'DOWN'|'LEFT'|'RIGHT'; timestamp: number }) => void;
  'room:ready':   () => void;
};
```

### 1.2 Servidor: Game Loop Autoritativo

El Game Loop es **el corazón de la seguridad anti-hack**. Corre exclusivamente en el servidor y el cliente solo renderiza el estado recibido, nunca lo genera.

```
┌─────────────────────────────────────────────────────────┐
│                  GAME LOOP AUTORITATIVO                  │
│                                                         │
│  LOBBY ──► DANCING ──► ANNOUNCING ──► ELIMINATING       │
│              ▲                             │            │
│              └─────────────────────────────┘            │
│                     (si quedan >1 jugadores)            │
└─────────────────────────────────────────────────────────┘
```

**Implementación con hrtime (alta precisión):**

```typescript
// GameLoop.ts
export class GameLoop {
  private tickRate = 20;          // 20 ticks/s (servidor, no frames)
  private tickInterval = 1000 / this.tickRate;
  private lastTick = BigInt(0);
  private timer: NodeJS.Timeout | null = null;

  start(onTick: (deltaMs: number) => void) {
    this.lastTick = process.hrtime.bigint();
    this.timer = setInterval(() => {
      const now = process.hrtime.bigint();
      const deltaMs = Number(now - this.lastTick) / 1_000_000;
      this.lastTick = now;
      onTick(deltaMs);
    }, this.tickInterval);
  }
}
```

**Fases del Game Loop:**

| Fase | Duración | Acción del servidor |
|---|---|---|
| `LOBBY` | Indefinido | Espera `room:ready` de todos |
| `DANCING` | 30s → 15s → 10s → 8s | Acepta `player:move`, valida posiciones |
| `ANNOUNCING` | 3s | Sortea color ganador, emite `game:announce` |
| `ELIMINATING` | 2s | Elimina bloques, calcula caídas, emite `game:eliminate` + `game:player_died` |
| `ROUND_END` | 2s | Si >1 vivos: nueva ronda. Si 1: `game:over` |

**Anti-hack — Validaciones en el servidor:**

```typescript
// PlayerManager.ts
validateMove(playerId: string, dir: Direction, clientTimestamp: number): boolean {
  const player = this.players.get(playerId);
  if (!player?.isAlive) return false;

  // Lag compensation: acepta movimientos hasta 200ms en el pasado
  const serverTime = Date.now();
  const lag = serverTime - clientTimestamp;
  if (lag > 200 || lag < 0) return false;  // rechaza si lag > 200ms o timestamp futuro

  // Velocidad máxima: 1 celda por tick (20 ticks/s = 1 celda cada 50ms)
  const lastMove = this.lastMoveTime.get(playerId) ?? 0;
  if (serverTime - lastMove < 80) return false;  // rate-limiting

  // Valida que la nueva posición esté dentro de la grilla
  const newPos = applyDirection(player.position, dir);
  if (!this.isInGrid(newPos)) return false;

  return true;
}
```

### 1.3 Cliente: InstancedMesh para la Grilla 12×12

**Por qué InstancedMesh**: Renderizar 144 cubos como objetos Three.js separados genera 144 draw calls. Con `InstancedMesh` son **1 draw call** → 60 FPS estables.

```typescript
// BlockGrid.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GRID_SIZE, BLOCK_SIZE, COLORS_MAP } from '@/lib/constants';

export function BlockGrid({ blocks }: { blocks: GameBlock[][] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = GRID_SIZE * GRID_SIZE; // 144

  // Geometría y material compartidos — solo se crean 1 vez
  const geometry = useMemo(() => new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE * 0.25, BLOCK_SIZE), []);
  const material  = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);

  useEffect(() => {
    if (!meshRef.current) return;
    const matrix = new THREE.Matrix4();
    const color  = new THREE.Color();

    blocks.flat().forEach((block, i) => {
      const x = (block.col - GRID_SIZE / 2) * BLOCK_SIZE;
      const z = (block.row - GRID_SIZE / 2) * BLOCK_SIZE;
      const y = block.isActive ? 0 : -10; // bloques eliminados caen

      matrix.setPosition(x, y, z);
      meshRef.current!.setMatrixAt(i, matrix);
      meshRef.current!.setColorAt(i, color.set(COLORS_MAP[block.color]));
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [blocks]);

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, COUNT]} receiveShadow />
  );
}
```

**Animación de caída con GSAP/lerp (sin rerender de React):**

```typescript
// En useFrame — animación imperativa sin reconciler
useFrame((_, delta) => {
  if (!meshRef.current) return;
  // Lerp de los bloques eliminados hacia abajo
  fallingIndices.forEach(i => {
    const m = new THREE.Matrix4();
    meshRef.current!.getMatrixAt(i, m);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    pos.y -= delta * FALL_SPEED; // 5 unidades/s
    m.setPosition(pos);
    meshRef.current!.setMatrixAt(i, m);
  });
  meshRef.current.instanceMatrix.needsUpdate = true;
});
```

---

## Fase 2 — Mecánica Core y Red (Semana 2)

### 2.1 Lag Compensation Básico

```
Cliente                          Servidor
   │                                │
   │──── player:move ──────────────►│
   │     { dir, timestamp: T }      │
   │                                │ lag = serverNow - T
   │                                │ if lag ≤ 200ms → válido
   │                                │ aplica movimiento en T (rewind)
   │◄─── game:state ────────────────│
   │     (state con posición nueva) │
```

- El cliente **predice localmente** el movimiento del jugador propio (Client Prediction).
- Al recibir el estado del servidor, **reconcilia** si hay diferencia.
- Para los demás jugadores, aplica **interpolación** entre el último estado conocido y el nuevo.

### 2.2 Sincronización de Tiempo

```typescript
// En el cliente — calcula el offset del reloj con el servidor
// Protocolo: cliente envía ping, servidor responde con su timestamp
const pingTimestamp = Date.now();
socket.emit('ping', { t: pingTimestamp });
socket.on('pong', ({ serverT }) => {
  const rtt = Date.now() - pingTimestamp;
  clockOffset = serverT - (pingTimestamp + rtt / 2); // offset estimado
});
```

---

## Fase 3 — Pulido Visual y Audio (Semana 3)

### 3.1 Efectos Visuales

- **Partículas** en eliminación de bloque (THREE.Points, máx 50 partículas/bloque)
- **Shader de brillo** en el color ganador anunciado (outline glow en InstancedMesh)
- **Cámara dinámica**: zoom out lento durante la danza, shake en la eliminación
- **Post-processing**: @react-three/postprocessing — Bloom suave + Vignette

### 3.2 Audio (Web Audio API)

- Loop de música de fondo (Web Audio API, fade in/out entre fases)
- SFX de eliminación, muerte, victoria
- `useAudio.ts` hook con control de volumen y mute

---

## Fase 4 — Salas y Lobby Multi-Room (Semana 4)

- Sistema de `GameRoom` múltiple en el servidor (Map<roomId, GameRoom>)
- Lobby screen con lista de salas disponibles
- Máx. 8 jugadores por sala
- Código de sala de 4 letras (ej. `AZUL`)

---

## Fase 5 — Despliegue (Semana 5)

| Servicio | Plataforma Recomendada |
|---|---|
| Cliente Next.js | Vercel |
| Servidor Fastify | Railway / Render / VPS |
| WebSockets | Railway (compatible nativo) |

> [!IMPORTANT]
> Vercel Serverless **NO soporta** WebSockets persistentes. El servidor Fastify **DEBE** correr en una plataforma con soporte de long-lived connections (Railway, Render, Fly.io, VPS con PM2).

---

## Preguntas Abiertas

> [!IMPORTANT]
> **¿Cuántos jugadores máximo por sala?** El diseño actual asume 8. ¿Ajustar?

> [!IMPORTANT]
> **¿Personaje 3D o 2D/sprite?** El plan usa un cubo vóxel simple (BoxGeometry) por jugador. ¿Se desea un modelo .glb humanoid?

> [!IMPORTANT]
> **¿Música original o placeholder?** Se puede usar Web Audio API con osciladores procedurales como placeholder hasta tener assets reales.

> [!IMPORTANT]
> **¿Sistema de cuentas/auth?** ¿Los jugadores son anónimos (solo nombre) o se requiere login?

---

# Parche Técnico: Corrección de Animación de Bloques en Ronda 2+ (Fase ANNOUNCING)

## Causa Raíz
El hook `useFrame` de React Three Fiber (R3F) registra un callback persistente en el bucle de renderizado asíncrono de Three.js. Al acceder directamente a las props del componente (`blocks`, `winnerColor`, `phase`, `round`, `isBlackout`), se genera un **stale closure** (closure congelado) que hace referencia a los valores del renderizado inicial (ronda 1). 
Cuando el juego avanza a la ronda 2, la prop `round` cambia a `2` y `phase` transiciona nuevamente por `'DANCING'` y `'ANNOUNCING'`, pero el bucle de renderizado asíncrono sigue evaluando las variables locales congeladas de la ronda 1. Esto bloquea por completo la animación de los bloques y los temblores a partir de la ronda 2.

## Solución Propuesta
1. **Referencias Mutables Inmediatas**: Implementar referencias `useRef` para todas las props y estados reactivos consumidos dentro de `useFrame`:
   ```typescript
   const blocksRef = useRef(blocks);
   const winnerColorRef = useRef(winnerColor);
   const phaseRef = useRef(phase);
   const roundRef = useRef(round);
   const isBlackoutRef = useRef(isBlackout);
   const settingsRef = useRef(settings);
   ```
2. **Sincronización síncrona en renderizado**: Actualizar el valor de las refs directamente durante el ciclo de render del componente:
   ```typescript
   blocksRef.current = blocks;
   winnerColorRef.current = winnerColor;
   phaseRef.current = phase;
   roundRef.current = round;
   isBlackoutRef.current = isBlackout;
   settingsRef.current = settings;
   ```
3. **Consumo Seguro en useFrame**: Modificar todo el bucle interno de `useFrame` para leer de las referencias mutables (`.current`). Esto garantiza lecturas en tiempo real, precisas y libres de closures de React en cualquier ronda (1, 2, 3, etc.).

## Plan de Verificación
1. **Compilación local**:
   - `npm run build` en el cliente para asegurar cero errores de TypeScript.
2. **Manual**:
   - El usuario validará in-game que al iniciar una partida en velocidad `⚡ TURBO`, el ecualizador y el bobbing de los bloques funcione a la perfección tanto en la Ronda 1 como en la Ronda 2, 3 y subsecuentes.

---

# Parche Técnico v2: Solución Definitiva para el Reloj de Animación 3D y la Sincronización de Audio (Pausa y Reanudación Fluida)

## 1. Diagnóstico de la Causa Raíz

### A. Animación 3D Estática en Ronda 2+
* **El Problema**: El ecualizador, las luces del escenario y las animaciones de zapatos y corazón de los personajes se quedan completamente estáticos en la ronda 2.
* **Causa**: Estos tres componentes consumían `track.seek()` de Howler.js para calcular el pulso de animación (`beatPulse`). En navegadores modernos, al pausar y reanudar la música por eventos asíncronos de WebSocket, la función `.seek()` de Howler se congela o devuelve un valor constante e inmóvil tras reanudarse en la ronda 2, apagando las animaciones.

### B. Música Duplicada en Ronda 1 y Reinicio Constantemente en Ronda 2+
* **El Problema**: En la ronda 1, la música suena dos veces de forma solapada (al iniciar `STARTING` y luego en `DANCING`). En rondas posteriores, la música vuelve a empezar de cero en lugar de reanudarse de forma fluida.
* **Causa**:
  1. En la ronda 1, tanto `STARTING` como `DANCING` disparan la condición `if (phase === 'STARTING' || phase === 'DANCING')` en [useAudio.ts](file:///d:/Proyectos/MusicalGame/musical-blocks-client/src/hooks/useAudio.ts). Al entrar en `DANCING`, como la música ya está sonando pero `activeDanceTrack.current` no es `null`, el código ejecutaba `activeDanceTrack.current.play()`. En Howler, llamar a `.play()` en un track en reproducción sin pausarlo genera una **reproducción paralela/solapada** del mismo sonido.
  2. Al haber dos instancias colgadas y corruptas en la ronda 1, cuando la fase `'ELIMINATING'` llamaba a `.pause()`, el estado interno de Howler se corrompía. Para recuperarse en la ronda 2 tras llamar a `.play()`, Howler se veía obligado a matar las instancias de audio y reproducir la pista desde cero, perdiendo el progreso acumulado de la música.

---

## 2. Solución Definitiva y Unificada

### A. Reloj de Animación Autoritativo en Three.js
Independizaremos por completo el tiempo de renderizado visual del seek físico de Howler. Utilizaremos el reloj nativo e ininterrumpible de Three.js (`state.clock.elapsedTime`) para guiar la oscilación del ecualizador (`beatPulse`) en los tres componentes 3D. 
Seguiremos leyendo el `activeBpm` del track de Howler dinámicamente para asegurar que la animación vibre exactamente en la misma frecuencia y ritmo que la música reproducida.

### B. Control Seguro de Audio en [useAudio.ts](file:///d:/Proyectos/MusicalGame/musical-blocks-client/src/hooks/useAudio.ts)
Modificaremos la lógica de transiciones de fase de audio para evitar reproducciones duplicadas y permitir una reanudación limpia en las rondas siguientes:
```typescript
if (phase === 'STARTING' || phase === 'DANCING') {
  if (!activeDanceTrack.current) {
    // Iniciar por primera vez la música
    ...
    activeDanceTrack.current = track;
    track.play();
  } else if (!activeDanceTrack.current.playing()) {
    // Reanudar ÚNICAMENTE si estaba pausada, evitando duplicados
    activeDanceTrack.current.play();
    activeDanceTrack.current.fade(activeDanceTrack.current.volume(), 0.45, 500);
  }
  // Si ya se estaba reproduciendo, no hacemos nada.
}
```

---

## 3. Archivos a Modificar

### 1. [useAudio.ts](file:///d:/Proyectos/MusicalGame/musical-blocks-client/src/hooks/useAudio.ts)
Implementar el condicional de reproducción seguro (`!activeDanceTrack.current.playing()`) en las transiciones de fases.

### 2. [BlockGrid.tsx](file:///d:/Proyectos/MusicalGame/musical-blocks-client/src/components/canvas/BlockGrid.tsx)
Actualizar el cálculo de `seekTime` para usar `state.clock.elapsedTime` de forma directa en el loop de `useFrame`.

### 3. [PlayerMesh.tsx](file:///d:/Proyectos/MusicalGame/musical-blocks-client/src/components/canvas/PlayerMesh.tsx)
Modificar el cálculo de `seekTime` en `useFrame` del personaje para usar `state.clock.elapsedTime`.

### 4. [StageShow.tsx](file:///d:/Proyectos/MusicalGame/musical-blocks-client/src/components/canvas/StageShow.tsx)
Modificar `seekTime` in `useFrame` del escenario para que las luces y lasers bailen fluidamente con Three.js.

---

# Parche Técnico v3: Persistencia y Sincronización Premium de Colores y Cosméticos de Jugadores

## 1. Diagnóstico de la Causa Raíz
* **El Problema**: Los cosméticos personalizados del jugador (accesorios como auriculares, mochilas y sus colores específicos) se borraban o sobreescribían con el color por defecto asignado por el servidor al iniciar una nueva partida o volver al lobby tras finalizar una ronda.
* **Causa**:
  1. El cliente no inicializaba el campo `primaryColor` (el color de la ficha del lobby) dentro de `localCosmetics` en `gameStore.ts`. 
  2. Al unirse a una partida, el servidor le asignaba al jugador cosméticos por defecto y un color de ficha aleatorio (`chosenColor`).
  3. En `setRoom` de `gameStore.ts` del cliente, la lógica de sincronización comparaba los cosméticos del servidor contra los locales. Al no tener el cliente el campo `primaryColor`, la comparación `me.cosmetics.primaryColor !== s.localCosmetics.primaryColor` (ej. `#FBD38D !== undefined`) siempre se evaluaba como `true`. Como consecuencia de esta *race condition*, el cliente sobrescribía localmente **todos sus accesorios y colores personalizados** con los valores por defecto del servidor, destruyendo la personalización en su `localStorage`.

---

## 2. Solución Premium e Inteligente
1. **Inicialización Completa**: Añadiremos el campo `primaryColor` en `localCosmetics` de `gameStore.ts` del cliente. Este actuará como el "color favorito de ficha" del jugador y se persistirá de forma segura en `localStorage`.
2. **Protección Sincrónica en el Cliente**: Refactorizaremos la sincronización de `setRoom` en `gameStore.ts` para que **bloquee cualquier intento de sobreescribir los accesorios** (`shoesColor`, `visorColor`, etc.) de la store local. El cliente únicamente sincronizará el `primaryColor` si el servidor lo cambia por conflicto de duplicados en la sala:
   ```typescript
   const me = room.players.find((p) => p.id === s.localPlayerId);
   if (me && me.cosmetics) {
     // Sincronizar ÚNICAMENTE el color de ficha si el servidor nos dio uno diferente por estar ocupado
     if (me.cosmetics.primaryColor && me.cosmetics.primaryColor !== s.localCosmetics.primaryColor) {
       s.localCosmetics.primaryColor = me.cosmetics.primaryColor;
     }
   }
   ```
3. **Flujo de Resolución de Conflictos**: Cuando el jugador entre a una nueva partida, enviará automáticamente sus cosméticos completos (incluido `primaryColor`). El servidor (mediante `setPlayerCosmetics`) intentará otorgarle su color favorito. Si ya está ocupado por otro jugador, el servidor le asignará otro color disponible, y el cliente actualizará únicamente su ficha (`primaryColor`), respetando al 100% sus zapatos, visor, corazón, mochila y auriculares elegidos.

---

## 3. Archivos a Modificar

### 1. [gameStore.ts](file:///d:/Proyectos/MusicalGame/musical-blocks-client/src/stores/gameStore.ts)
- Añadir `primaryColor` en la inicialización de `localCosmetics` de la store.
- Modificar la acción `setRoom` para que solo sincronice `primaryColor` si hay conflicto, blindando la store local contra la sobreescritura del servidor.
