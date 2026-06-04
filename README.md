# ⚡ VoxelRave

> A multiplayer voxel rhythm game — Block Party clone built with Next.js, React Three Fiber, and Socket.io.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)
![Three.js](https://img.shields.io/badge/Three.js-r184-000000?logo=three.js)
![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?logo=fastify)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io)

---

## How to Play

1. **Join the Arena**: Players connect to the lobby by choosing an alias and joining either a public room or creating/joining a private custom room with a 4-letter code.
2. **Warm Up in the Lobby**: Chat with other players, configure match parameters (if you are the host), toggle your ready status, and wait for the countdown to start!
3. **Dance Phase**: A colorful 12×12 block grid appears. Move around using keyboard arrows/WASD or the touch D-Pad.
4. **Winning Color Announcement**: The server selects a winning color and announces it. Under **Blind Modifiers**, the colors on the arena disappear, testing your photographic memory!
5. **Voxel Elimination**: Non-matching blocks fall away into the void. Players standing on the wrong blocks fall and lose a life.
6. **Spectate & Support**: Eliminated players fall to their death, but immediately enter **Spectator Mode**, allowing them to watch the remaining players in 3D and chat with other fallen dancers.
7. **Victory**: Dancers play progressive, increasingly faster rounds until only one remains with lives intact. The last standing dancer wins the crown!

---

## 🌟 Key Features & Modifiers

VoxelRave is not just a standard clone—it's loaded with advanced customizable systems:

*   **👑 Full Host Control & Match Settings**:
    *   **Difficulty & Color Ranges**: Choose between **Easy (4 colors)**, **Normal (6 colors)**, **Hard (8 colors)**, and **Extreme (10 colors)**. More colors significantly reduce safe zones!
    *   **Game Speed**: Set the tempo from **Chill** (relaxed) to **Standard** (classic progressive speed-up) or **Turbo** (insane high-speed adrenaline from Round 1).
    *   **Lives System**: Adjust the threshold of forgiveness. Play with **1 Life (Classic Sudden Death)**, **3 Lives (Recommended)**, or **5 Lives** for long-duration practice.
*   **🎛️ 3D Cosmetics Locker (Vestidor de Avatar)**:
    *   Interactive side panel in the waiting lobby with a real-time mini R3F canvas and OrbitControls.
    *   Customization of player colors: primary suit, shoes, visor, chest heart, dynamic headphones, backpack, and floating cyber pet.
    *   Accessory toggles: toggle headphones, jetpack backpack, and select floating pet variants (Voxel Cassette, Floppy disk, Pulse Orb).
    *   Selectable animations: customize your idle, dance, and celebrate styles (e.g. Classic Shuffle, Spin-Out Spin, Robot Twist, Leap Backflip).
    *   Intelligent color locking: prevents players from selecting colors already in use by others.
*   **👥 Player-to-Player Collisions**:
    *   Host-controlled configuration toggle. When active, players physically push and block each other on the voxel tiles, adding tactical complexity and intense competitive positioning.
*   **🛡️ Authoritative Security & Anti-Cheat Engine**:
    *   Tick-rate validation for socket connections (10 conn/IP/min) to prevent room creation spam and DDoS.
    *   Strict rate limiting and speed hack checks on player inputs (rejecting moves under 100ms or exceeding lag limits >2000ms).
    *   Session tokens signed with HMAC to prevent socket hijacking and session spoofing.
    *   Suspicious logs automatically transported to server console/file with fast Pino logging.
*   **👁️ Blind Modifier (Blackout Mode)**:
    *   When activated, all colors on the arena turn black/gray during the color announcement phase. Dancers must rely on their spatial photographic memory to stand on the correct block!
*   **🟫 Sudden Death Modifiers (Arena Shrinking)**:
    *   **Standard**: The board starts dropping blocks permanently (1 by 1) from Round 10 onwards (max 20 blocks removed).
    *   **Chaos Mode**: The floor begins falling right from Round 1! Starting at Round 11, blocks drop 2 by 2, shrinking the arena down to a maximum of 30 blocks removed.
*   **💬 WebSocket Chat & Announcements**:
    *   Lobby chat for all participants, in-game floating notifications, and a dedicated **Spectator Chat** where dead players can talk while watching the live game. System events (deaths, round transitions, victory) are announced automatically.
    *   **Dynamic Chat Colorization**: System messages (wins, falls, kicks, rounds) are dynamically colored in the chat log to match the exact player's customized suit color or the round's current difficulty indicator.
*   **🌎 Multi-language Translation (EN / ES)**:
    *   Full out-of-the-box support for both **English** and **Spanish**, localized based on client settings. Includes token replacements and translation mapping for all colors/settings.
*   **📱 Mobile & Touch Optimized**:
    *   Responsive layout with a virtual touch D-pad overlay. Features a **Responsive R3F Camera scaling handler** that automatically shifts camera positions and FOV between portrait and landscape screens. Prevents default scrolling and browser gestures.
*   **🎬 Majestic 3D Camera Intro & Ambient Lights**:
    *   **Premium Orbital Sweep**: Cinematic descending 180° camera sweep on round start, synchronized with neon pulse lights.
    *   **Capped Frame-Delta Timing**: Robust delta timing caps frame drops to prevent jerky slides, ensuring a perfectly smooth flight on load.
    *   **Volumetric Spotlights & Lasers**: 4 corner robotic spotlights sweeping the stage, criss-crossing neon lasers, and beat-flashing center lighting.
*   **🎉 Premium Final Victory Celebration**:
    *   **Voxel Fireworks**: Volumetric voxel-style quantized bursts forming geometric star-shells in the neon sky.
    *   **Confetti Cascades**: Dense streams of color-coded particles floating continuously around the winning player.
    *   **Delayed Transparent UI & OrbitControls**: The winner card fades in after 4.5s of unobstructed 3D viewing, showing a sleek golden banner first. The overlay is highly transparent (`rgba(3, 3, 10, 0.28)`) with minimal blur (`2px`), unlocking 360° interactive orbit camera controls.
*   **🔗 Frictionless Direct Room Joining (URL-Based)**:
    *   **Auto-detection & Validation**: Seamlessly parses `?room=CODE` on client mount and validates the 4-character code.
    *   **One-click Auto-Join**: Auto-connects the socket and enters the lobby if they have a saved nickname stored in `localStorage`.
    *   **Premium Onboarding**: First-time users see a glowing golden/neon badge stating *"🏆 Joining Room CODE"*, focusing the name input instantly.
    *   **Robust Fallbacks**: Automatically sanitizes the URL and displays a premium Toast if the room is invalid, full, or already started.


---

## Project Structure

```
MusicalGame/
├── musical-blocks-client/   # Next.js 16 (App Router) + React Three Fiber + Zustand + Custom CSS
├── musical-blocks-server/   # Fastify 5 + Socket.io (Authoritative physics and lag compensation)
└── shared/                  # Shared TypeScript types, events contracts, and game constants
```

---

## Quick Start

```bash
# 1. Start the server
cd musical-blocks-server
npm run dev

# 2. Start the client (separate terminal)
cd musical-blocks-client
npm run dev

# Client: http://localhost:3000
# Server: http://localhost:3001
```

---

## Task Board

### ✅ Phase 0 — Environment Setup

- [x] Create monorepo root at `d:\Proyectos\MusicalGame`
- [x] Bootstrap Next.js client (`musical-blocks-client`) with TypeScript + Tailwind CSS v4
- [x] Install R3F stack: `three`, `@types/three`, `@react-three/fiber`, `@react-three/drei`
- [x] Install `socket.io-client` on client
- [x] Create `musical-blocks-server` directory
- [x] Initialize server with `npm init -y`
- [x] Install `fastify`, `@fastify/websocket`, `socket.io`, `typescript`, `ts-node`
- [x] Create `shared/` directory at monorepo root
- [x] Add `shared/types.ts` with all shared interfaces (`Player`, `GameBlock`, `GameState`, `BlockColor`, `Room`, `RoomSummary`, server/client event maps, constants)
- [x] Configure `tsconfig.json` for the server (`module: CommonJS`, `strict: true`, `@shared/*` path alias via tsconfig-paths)
- [x] Keep TypeScript at `^5.9.3` (latest stable — 5.4.x doesn't exist in npm registry)
- [x] Add server scripts to `package.json`: `"dev": "ts-node -r tsconfig-paths/register src/index.ts"`, `"build": "tsc"`, `"start": "node dist/index.js"`
- [x] Add `@types/node`, `tsconfig-paths`, `pino-pretty` as dev dependencies to server
- [x] Create root `.gitignore` covering `node_modules/`, `.next/`, `dist/`
- [x] Verify client runs: `cd musical-blocks-client && npm run dev` → `localhost:3000` ✅
- [x] Verify server entry point `src/index.ts` compiles with ts-node ✅ Running at localhost:3001
- [x] Install Zustand + Immer for client state: `npm install zustand immer`
- [x] Install `src/shared/types.ts` copy inside client for Turbopack compatibility
- [x] Configure `.env.local` with `NEXT_PUBLIC_SERVER_URL=http://localhost:3001`

---

### 🏗️ Phase 1 — Server: Core Architecture

#### 1.1 Types & Contracts
- [x] Define `BlockColor` union type (extended up to 10 active colors: RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE, PINK, CYAN, LIME, WHITE)
- [x] Define `Player` interface (id, name, position `{x, z}`, isAlive, isReady, isHost, color, hasReturnedToLobby)
- [x] Define `GameBlock` interface (row, col, color, isActive, isDead)
- [x] Define `GamePhase` union type (LOBBY | DANCING | ANNOUNCING | ELIMINATING | ROUND_END | GAME_OVER)
- [x] Define `GameState` interface (phase, round, timeLeft, winnerColor, blocks[][], players[], winnerId, isBlackout)
- [x] Define `Room` + `RoomSummary` interfaces (id, visibility, status, players, maxPlayers, hostId, settings)
- [x] Define `ServerEvents` type map (all server → client events, including chat broadcasts)
- [x] Define `ClientEvents` type map (all client → server events, including host settings and chat send events)
- [x] Define shared constants: `GRID_SIZE`, `MAX_PLAYERS`, `COLOR_HEX`, `PLAYER_COLORS`, `ROUND_DURATIONS`, bounds/rate limit constants

#### 1.2 Fastify Server Entry Point (`src/index.ts`)
- [x] Initialize Fastify instance with logger enabled (pino-pretty)
- [x] Register `@fastify/cors` plugin for cross-origin requests
- [x] Attach Socket.io server to Fastify's `httpServer` via `io.attach()` in `onReady` hook
- [x] Configure Socket.io CORS: allow `http://localhost:3000` (or LAN requests)
- [x] Add health-check route `GET /health` → `{ status: 'ok', ts: timestamp }`
- [x] Add `GET /rooms` REST route for public room list
- [x] Start server on port `3001`
- [ ] Export server instance for testing

#### 1.3 Game Room (`src/game/GameRoom.ts`)
- [x] Implement `GameRoom` class with `roomId`, `players`, `grid`, `loop`, `settings`
- [x] Method `addPlayer(socketId, name): boolean` — validates max 8 players
- [x] Method `removePlayer(socketId): void` — handles host promotion, triggers game over if needed
- [x] Method `buildState(): GameState` — returns current immutable snapshot
- [x] Method `startGame(requesterId)` — host-only, validates min 2 players, configures lives
- [x] Method `handlePlayerMove()` — delegates to PlayerManager with phase guard
- [x] Implement `GridManager` — generates 12×12 random color grid per round
- [x] `GridManager.generate()` — assigns random `BlockColor` to each cell, applies Sudden Death falling blocks
- [x] `GridManager.eliminate(winnerColor)` — returns array of `{row, col}` removed
- [x] `GridManager.isBlockActive(pos)` — used by PlayerManager death detection
- [x] Room `status` property: `'waiting' | 'playing' | 'finished'`
- [x] `GameRoom.generateCode()` — 4-letter code (avoids I/O confusion)

#### 1.4 Round Manager (`src/game/RoundManager.ts`)
- [x] Round logic integrated directly into `GameLoop.ts` (simpler, avoids extra dependency)
- [x] `ROUND_DURATIONS` constant in `shared/types.ts` configured for CHILL, NORMAL, and TURBO
- [x] Duration clamping at last index implemented in `GameLoop.transitionTo('DANCING')`
- [x] `GridManager.pickWinnerColor()` — ensures only colors with ≥1 active block are selected
- [x] `GridManager.getColorDistribution()` — sent to client on `game:announce` for UI display
- [x] Phase state machine: `advancePhase()` in `GameLoop.ts`

#### 1.5 Authoritative Game Loop (`src/game/GameLoop.ts`)
- [x] Implement `GameLoop` class with `tickRate = 20` (20 ticks/second)
- [x] Use `process.hrtime.bigint()` for high-precision delta timing
- [x] Implement `start(): void` and `stop(): void` — clears interval, prevents memory leaks
- [x] Track `phaseMs` in ms, decrement per tick via deltaMs
- [x] Emit `timeLeft` to clients every second via `onTimeTick` callback (not every tick)
- [x] Phase transitions triggered when `phaseMs ≤ 0`
- [x] Typed `GameLoopCallbacks` interface for all phase transition hooks

#### 1.6 Player Manager (`src/game/PlayerManager.ts`)
- [x] Track `lastMoveTime: Map<string, number>` for rate limiting
- [x] Implement `validateMove(playerId, dir, clientTimestamp): boolean`
  - [x] Reject if player not alive
  - [x] Reject if lag > 2000ms or timestamp in future (uses `LAG_TOLERANCE_MS` constant)
  - [x] Reject if rate-limited (< 100ms since last move via `MOVE_RATE_LIMIT_MS` constant)
  - [x] Reject if new position out of grid bounds (0–11)
  - [x] Reject if standing on a permanently eliminated Sudden Death block
- [x] Implement `applyMove(playerId, dir): GridPosition` — applies direction
- [x] Implement `checkDeaths(grid): string[]` — returns IDs of players on eliminated blocks, decrements lives
- [x] Implement `getAlive(): Player[]`, `getWithLives(): Player[]`, and `getAll(): Player[]`
- [x] Implement `getWinner(): Player | null` — returns last player standing with lives > 0
- [x] Implement `resetForRound()` — revives players with lives left and respawns them on active cells
- [x] `randomSpawnPosition(grid)` — even distribution across the surviving blocks on the grid

#### 1.7 Socket.io Handlers (`src/socket/handlers.ts`)
- [x] Handle `connection` — log socket ID
- [x] Handle `room:create` — validates name, creates public/private room, host assigned
- [x] Handle `room:join_public` — auto-matches to existing room or creates new public one
- [x] Handle `room:join_private` — joins by 4-letter code with error messages
- [x] Handle `room:leave` — removes from room, schedules cleanup if empty
- [x] Handle `player:ready` — toggles ready state, broadcasts `room:updated`
- [x] Handle `host:start_game` — host-only start, validates min 2 players
- [x] Handle `host:update_settings` — host-only, updates customizable speed, colors, lives, and modifiers
- [x] Handle `player:move` — delegates to `GameRoom.handlePlayerMove()` with all validations
- [x] Handle `chat:send` — room-wide chat broadcast, supports lobbies and spectator-only dead chat
- [x] Handle `disconnect` — auto-leave room, host promotion, game over if needed
- [x] Handle `ping` / emit `pong` — clock sync for lag compensation
- [x] Handle `room:get_list` — returns public room summaries
- [x] `validateName()` helper — alphanumeric + accents, 2–16 chars, sanitized

#### 1.8 Room Registry (`src/game/RoomRegistry.ts`)
- [x] `RoomRegistry` class — `Map<roomId, GameRoom>` singleton shared across all sockets
- [x] `create(hostSocketId, hostName, visibility)` — ensures unique code, public or private
- [x] `findAvailablePublicRoom()` — auto-join to first available public room with space
- [x] `joinPrivate(code)` — returns typed `{ room, error }` with descriptive error messages
- [x] `getRoomBySocketId()` — reverse lookup for move/disconnect handlers
- [x] `getPublicList()` — returns `RoomSummary[]` for REST + socket events
- [x] `scheduleCleanup(roomId)` — 30s grace period before destroying empty rooms

---

### 🎮 Phase 2 — Client: Game Engine & Networking

#### 2.1 Socket Client (`src/lib/socketClient.ts`)
- [x] Create singleton `socket = io('http://localhost:3001')` with lazy init
- [x] Export typed `socket` with `ServerEvents` and `ClientEvents` generics
- [x] Implement clock sync on connect: emit `ping`, handle `pong` → calculate `clockOffset`
- [x] Auto-reconnect configuration (retries: 5, delay: 1000ms)

#### 2.2 Game Store (`src/stores/gameStore.ts`)
- [x] Create Zustand store with full `GameState` slice (Immer enabled)
- [x] Actions: `setGameState`, `setPhase`, `updateBlocks`, `setWinnerColor`, `markPlayerDead`, `addChatMessage`
- [x] Local player slice: `localPlayerId`, `localPlayerName`, `screen` navigation state, `language` translation key
- [x] UI state: `isConnected`, `roomListRefreshKey`, `connectionError`
- [x] Subscribe to socket events → update store (in `useSocket.ts`)

#### 2.3 Socket Hook (`src/hooks/useSocket.ts`)
- [x] Connect to server on mount, disconnect on unmount
- [x] Listen to all `ServerEvents` and dispatch to Zustand store
- [x] Expose `getSocket()` helper typed with `ClientEvents`
- [x] Auto-ping/pong for clock synchronization on connect

#### 2.4 Player Input Hook (`src/hooks/usePlayerInput.ts`)
- [x] Listen to `keydown`: Arrow keys + WASD → map to `Direction`
- [x] On valid key: call `socket.emit('player:move', { direction, timestamp: Date.now() })`
- [x] Phase guard: only allow input during `DANCING` and `ANNOUNCING` phases
- [x] Mobile support: virtual D-pad component emitting same events

#### 2.5 Block Grid (`src/components/canvas/BlockGrid.tsx`) ⚡ CRITICAL
- [x] Use `THREE.InstancedMesh` with `count = 144` (12×12)
- [x] Single `BoxGeometry` + `MeshLambertMaterial({ vertexColors: true })`
- [x] On `blocks` prop change: update `instanceMatrix` + `instanceColor` (winning color highlights)
- [x] Eliminated blocks: falling animation via `useFrame` (imperative updates)
- [x] Dispose geometry and material on unmount

#### 2.6 Player Mesh (`src/components/canvas/PlayerMesh.tsx`)
- [x] Render voxel-style character: `BoxGeometry` head + body
- [x] Interpolate position between server updates (lerp for smooth 60fps movement)
- [x] Name label using `<Text>` from `@react-three/drei`
- [x] Death animation: fall + scale down on `player.isAlive === false`
- [x] Distinguish local player (gold name label + eye plane overlay)

#### 2.7 Game Canvas (`src/components/canvas/GameCanvas.tsx`)
- [x] `<Canvas>` with `shadows`, `camera={{ position: [0, 18, 14], fov: 50 }}`
- [x] Lighting: `ambientLight` + `directionalLight` (shadows) + custom cyan/magenta neon point lights
- [x] Atmosphere: `<Stars>` + `<fog>` + `<Environment preset="night">`
- [x] Include `<BlockGrid>`, `<PlayerMesh>` list, and gorgeous custom NeonGrid Y=-2.0 background floor
- [x] Dynamic import (no SSR) to avoid browser-only API errors

#### 2.8 HUD Components
- [x] `GameHUD.tsx` — Timer, winner color swatch, player list with lives/deaths, and round banner
- [x] Timer: red pulsing animation when < 3s during ANNOUNCING phase
- [x] Color indicator: large block + glow effect during ANNOUNCING
- [x] Player list: alive/dead status + skull/heart icons
- [x] Round banner: "⚡ Round X — Survive!" and "SUDDEN DEATH" popping animations

#### 2.9 UI Screens
- [x] `LobbyScreen.tsx` — Premium dark glassmorphism, Quick Join, Create/Join Private, room search browser
- [x] `RoomLobby.tsx` — Waiting room, host setting sliders/tabs, player cards, Kick buttons, Host Start button, code copy
- [x] `EndScreens.tsx` — GameOver (Spectating banner) + WinnerScreen (Confetti celebration + return to lobby auto-timer)
- [x] Transitions: Framer-like CSS animations and GLITCH keyframes for all UI elements

---

### 🎨 Phase 3 — Visual Polish & Audio

#### 3.1 Voxel Aesthetics
- [x] Stars/particles in background using `<Stars>` from drei
- [x] Ground platform: solid base platform below grid (`#1a1a2e` Lambert material)
- [x] Fog: `<fog>` atmospheric depth
- [x] `<Environment preset="night">` for reflections
- [x] Block borders: thin grid segment overlay for Minecraft-style edge lines (NeonGrid)
- [x] Block faces: distinct top/side colors via vertex lighting

#### 3.2 Particle Effects
- [x] Block elimination: burst of colored particles (`THREE.Points`) at eliminated positions
- [x] Particle pool: reuse 500 particles max to avoid GC pressure
- [x] Player death: dust particles
- [x] Winner celebration: `THREE.Points` confetti raining from above

#### 3.3 Post-Processing (`@react-three/postprocessing`)
- [x] Bloom effect on winning color blocks during ANNOUNCING
- [x] Vignette: dark edges for cinematic feel
- [x] Camera shake on block elimination (0.1 intensity, 2 frames)

#### 3.4 Audio (`src/hooks/useAudio.ts`)
- [x] Initialize `AudioContext` on first user interaction (autoplay policy)
- [x] Countdown beeps via Web Audio oscillators (procedural, no assets needed)
- [x] Loop background music: fade in on game start, fade out on game over
- [x] SFX: block click, rumble on elimination, chime on victory, death pop
- [x] Mute toggle button in HUD
- [x] Volume control stored in `localStorage`

#### 3.5 Responsive & Mobile
- [x] Virtual D-pad overlay (grid layout, bottom-right, `position: fixed`)
- [x] Canvas auto-resizes (R3F handles automatically)
- [x] HUD adapts to portrait/landscape via CSS media queries and flex grids
- [x] Prevent default touch scroll on Canvas element (via body CSS `overflow: hidden` and touch propagation handlers)

---

### 🏠 Phase 4 — Multi-Room & Lobby System ✅ COMPLETE

- [x] Server: `RoomRegistry` class — `Map<roomId, GameRoom>` singleton
- [x] Room auto-creation: generate 4-letter code (e.g., `AZUL`, `ROJO`)
- [x] `GET /rooms` REST endpoint — returns `RoomSummary[]`
- [x] Socket events: `room:create`, `room:join_public`, `room:join_private`, `room:leave`
- [x] Max 8 players per room; reject if full with error message
- [x] Auto-cleanup: destroy room after 30s grace period when empty
- [x] Client lobby screen: Browse public rooms via REST, refresh on demand
- [x] Room code copy: click badge to copy 4-letter code to clipboard
- [x] URL-based room join: parse `?room=` on load, auto-join if room exists

---

### 🟫 Phase 4.5 — Blockbench: Player Model & Animations ✅ COMPLETE

> Create the voxel player model in Blockbench and export it as `.glb` for use with `useGLTF` in R3F.

- [x] Install [Blockbench](https://www.blockbench.net/) (free, desktop app)
- [x] Create new **Generic Model** project (`File → New → Generic Model`)
- [x] Set project unit size to `16px` (Minecraft-scale reference)
- [x] Build body parts as separate groups:
  - [x] `Body` — 8×12×4 px box (torso)
  - [x] `Head` — 8×8×8 px box (attached on top of Body)
  - [x] `LeftArm` + `RightArm` — 4×12×4 px boxes (sides of torso)
  - [x] `LeftLeg` + `RightLeg` — 4×12×4 px boxes (below torso)
- [x] Apply UV texture (16×32 px PNG, Minecraft skin format)
  - [x] Paint base skin color per group face in the UV editor
  - [x] Add simple face: 2 eyes (dark pixels) on Head front face
- [x] Pivot points: set each limb pivot at its connection to the body for correct rotation
- [x] Create animations: `idle`, `walk`, `death`, and `celebrate`
- [x] Export GLB and save as `public/models/player.glb`
- [x] Replace `BoxGeometry` character with `useGLTF('/models/player.glb')` inside `PlayerMesh.tsx`

---

### 🌟 Phase 4.6 — Expansión Dinámica de Arena y Avatares Reactivos ✅ COMPLETE

- [x] **Modelo Voxel 3D Premium con Texturizado PBR**: Creado modelo de avatar en formato `.glb` con mapas de emisión cyberpunk.
- [x] **Accesorios Reactivos y Variaciones de Compañero**: Soporte en código para variantes retro de mascota flotante (`cassette`, disquete `floppy`, u orbe orbital flotante), auriculares rítmicos y Cyber-Backpack con propulsores de partículas.
- [x] **6 Animaciones Dinámicas por Código**: Controladas mediante `useFrame` con transiciones suaves (Idle, Walk, Dance/Dance2, Jump con deformación squash/stretch, Death con caída modular y Celebrate con giros rápidos).
- [x] **Clonación de Esqueleto Aislada**: Cada avatar en escena clona su propia instancia de esqueleto para evitar que las animaciones o desvíos temporales afecten visualmente a los demás jugadores.
- [x] **Suavizado de Rotación y Visor LED**: Movimiento lerpeado fluido y corrección en la vista del visor frontal para alinearse siempre en la dirección del movimiento, incluso al caminar de espaldas (`S`).
- [x] **Arena de Baile Audio-Reactiva [¡TAREA 2 COMPLETADA!]**:
  - [x] **Pulsación de Color y Bobbing**: Bloques ganadores con respiración física y pulsos de brillo neón ajustados al beat del audio en tiempo real.
  - [x] **Tensión del Vacío y Temblores de Último Segundo (Tremor FX)**: Los bloques marcados para caer vibran rápidamente *únicamente durante el último segundo* (`timeLeft <= 1`) del conteo, evitando el ruido visual constante.
  - [x] **Estelas digitales**: Generación de chorros de partículas al disolverse o colapsar los bloques de la rejilla.
  - [x] **Estabilización de Iluminación**: Desacoplamiento del brillo constante (`1.2x`) del bloque seguro durante la Muerte Súbita o Modo Ciego, desactivando el bobbing físico oscilante para una vista óptima del jugador.

---

### 🌟 Características y Ajustes de Jugabilidad Completados ✅

A continuación se detallan las tareas estéticas, cinemáticas, de red y de jugabilidad que han sido totalmente integradas y validadas en el juego:

#### 🎨 Sección A: Personalización y Experiencia Visual

- [x] **1. 🎛️ Locker de Cosméticos / Selector de Accesorios (UI + 3D)**:
  - Crear un panel lateral interactivo (Vestidor) en el lobby con un canvas R3F miniatura en tiempo real para visualizar al personaje girando.
  - Permitir a los jugadores equipar/desequipar sus accesorios dinámicamente (mascota retro, auriculares, mochilas).
  - Integrar variantes de Skins/Materiales para cambiar el aspecto del traje (Plástico Mate, Cromo Metálico brillante, o Neón Holográfico con shader emisivo).
- [x] **2. 🚨 Luces de Escenario y Láseres (Ambiente y Show 3D)**:
  - Añadir 4 focos robóticos (Spotlights) funcionales en las esquinas de la grilla que barran automáticamente el escenario con luces volumétricas de color cambiante.
  - Generar láseres neón delgados y dinámicos que crucen en ángulos atractivos sobre las cabezas de los personajes.
  - Implementar un sutil destello (flash) de luz ambiental general sincronizado con cada golpe fuerte del beat de la música.
- [x] **3. 🎬 Cámara Cinemática y Animaciones de Transición**:
  - **Barrido Inicial**: Paneo dramático de cámara descendente desde el espacio profundo estrellado hacia la arena al iniciar la ronda.
  - **Zoom de Tensión**: Acercamiento suave de cámara hacia el jugador local en la fase de color (`ANNOUNCING`), amplificando el rumble/shake de pantalla al caer el resto de los bloques.
  - **Cámara Espectador Interactiva**: Permitir rotar libremente la cámara 3D al morir o seguir automáticamente al jugador con mayor puntuación/vida de forma fluida.
- [x] **4. 🎉 Celebración Final de Victoria**:
  - Lanzamiento de fuegos artificiales volumétricos basados en partículas de voxel art al coronar al ganador de la partida.
  - Cascadas densas de confeti digital neón flotando alrededor del avatar ganador en su podio.

#### 🌐 Sección B: Ajustes de Red, Seguridad y Jugabilidad Autorativa

- [x] **5. 👥 Alternancia de Colisiones entre Jugadores (Player-to-Player Collision Toggle)**:
  - Añadir una nueva opción de configuración en **Match Settings** (Opciones de Partida) controlada por el Host para habilitar o deshabilitar las colisiones físicas entre los personajes.
  - Sincronizar esta configuración en tiempo real a través del servidor y aplicar lógica condicional en la grilla y el movimiento:
    - *Colisión Desactivada*: Los jugadores pueden atravesarse libremente al correr.
    - *Colisión Activada*: Los avatares se empujan y bloquean físicamente el paso en la grilla (aumentando la dificultad táctica al competir por bloques).
- [x] **6. 🔗 Unirse Mediante Enlace Directo (URL-Based Room Joining)**:
  - Parsear la query `?room=CODE` al cargar el cliente. Si el código de sala es detectado y válido, omitir el lobby de selección y conectar automáticamente al jugador a la sala privada especificada. Al abandonar la sala o terminar la partida, se elimina el parámetro de la URL.
- [x] **7. 🛡️ Límite de Conexiones por IP (Connection Rate Limiting)**:
  - Control de flujo de sockets en el backend limitando la entrada a un máximo de **10 conexiones/IP/minuto** para mitigar ataques DDoS y spam de creación de salas.
- [x] **8. 📝 Registro de Actividad Sospechosa (Suspicious Activity Log)**:
  - Generar logs automáticos mediante transporte rápido de `pino` en el servidor ante desviaciones de lag extremas (>2000ms) o movimientos con tasa de input inválida.
- [x] **9. 🔑 Firmas Criptográficas de Sesión (HMAC Session Tokens)**:
  - Implementar firmas de tokens HMAC únicas en la inicialización del cliente para verificar que las peticiones pertenecen de forma segura a la sesión del socket original y evitar hijacking.

---

### 🔒 Phase 5 — Anti-Cheat & Security

- [x] Rate limit Socket.io connections: max 10 connections/IP/minute
- [x] Validate all incoming events on server — never trust client data
- [x] Sanitize player name: alphanumeric + accents, 2–16 chars, server-side
- [x] Reject moves outside current grid bounds server-side (0–11)
- [x] Reject moves during non-DANCING phases
- [x] Reject moves with lag > 2000ms or timestamp in the future
- [x] Rate-limit moves: reject if < 100ms since last move per player
- [x] Server-side phase enforcement: host:start ignored if game already running
- [x] Log suspicious activity to console/file with fast `pino` transport
- [x] Implement basic HMAC token per session to prevent spoofed socketIds / hijacking

---

### 🧪 Phase 6 — Testing

- [x] Automated security test suite: `security_test.js` (validates Rate Limiting, HMAC spoof prevention, and suspicious speed hack/lag log generation)
- [x] Install test dependencies: `vitest`, `@testing-library/react`, `jsdom` on server and client
- [x] Unit test: `GridManager.generate()` — verify 144 blocks, 6 colors, valid distribution
- [x] Unit test: `GridManager.eliminate(color)` — verify correct blocks marked inactive
- [x] Unit test: `PlayerManager.validateMove()` — all invalid cases rejected
- [x] Unit test: `GridManager.pickWinnerColor()` — returns only colors with ≥1 active block
- [x] Integration test: full round cycle (LOBBY → STARTING → DANCING → ANNOUNCING → ELIMINATING → ROUND_END)
- [x] Integration test: player death detection after elimination
- [x] Integration test: 2-player game ends correctly when 1 survives
- [x] Client test: Zustand `gameStore` state management, room synchronization, and screen auto-navigation
- [x] Client test: `colorUtils.hexToRgba()` conversion, opacity, and fallbacks

---

### 🎨 Phase 6.5 — Rebrand, SEO & Accessibility

- [x] Rebrand from "Musical Blocks" to "VoxelRave" across server and client configuration
- [x] Generate premium voxel neon cube brand assets (`app/icon.png`, `app/apple-icon.png`, `public/og-image.png`)
- [x] Implement complete Next.js metadata objects for SEO (Spanish defaults, custom keywords, OG, Twitter tags)
- [x] Create PWA web manifest file (`app/manifest.ts`)
- [x] Create crawlers configuration (`app/robots.ts` and `app/sitemap.ts`)
- [x] Add dynamic client-side HTML lang sync based on Zustand store language state
- [x] Standardize semantic HTML (`<main>`, headings structure) and accessibility `aria-labels` in all screens
- [ ] Verify production compilation and passes test suite

### 🚀 Phase 7 — Lobby Logic Enhancements

- [x] Implement percentage-based Ready threshold (Math.max(2, Math.ceil(players/2)))
- [x] Add auto-start countdown logic (5 seconds) once threshold is met
- [x] Add server-side AFK check: kick unready players inactive for 90s
- [x] Update RoomLobby UI to display required ready counts dynamically
- [x] Update English and Spanish locales for AFK kicks and auto-start

---

### 🚀 Phase 8 — Deployment

- [ ] Add `Dockerfile` for server
- [ ] Add `npm run build` script: `"build": "tsc --project tsconfig.json"`
- [ ] Configure `tsconfig.json` `outDir: "dist"`, `rootDir: "src"`
- [ ] Set environment variables: `PORT`, `CLIENT_ORIGIN`, `NODE_ENV`
- [ ] Add `railway.json` or `render.yaml` deployment config
- [ ] Verify WebSocket support is enabled on hosting platform
- [ ] Configure health check: `GET /health` → used by platform restart policy
- [ ] Set up PM2 or equivalent for crash recovery on VPS
- [ ] Set `NEXT_PUBLIC_SERVER_URL` env var pointing to deployed server
- [ ] Deploy client to Vercel via GitHub integration

---

### 📦 Phase 9 — Polish & Future Features

- [x] Spectator mode: dead players can watch the active players in 3D
- [ ] Leaderboard: track wins per session with in-memory counter
- [x] Chat: simple text chat during LOBBY phase and spectator-only dead chat
- [x] Custom skins: player name color selection in lobby (via 3D Avatar Locker)
- [ ] Power-ups: random block that gives immunity for 3 seconds
- [ ] Replay system: record GameState snapshots for post-game review
- [ ] Sound pack selection: different music themes per room
- [ ] Accessibility: color-blind mode (patterns overlay on blocks)
- [ ] Progressive Web App (PWA) manifest for mobile install

---

## Architecture: Authoritative Game Loop

```
CLIENT                              SERVER (Authoritative)
  │                                      │
  │──── player:move ──────────────────►  │
  │     { dir: 'RIGHT', ts: 1234 }       │  1. Validate lag ≤ 200ms
  │                                      │  2. Rate-limit check (≥ 80ms since last)
  │  [Client Prediction]                 │  3. Bounds check (0-11)
  │  Immediately move local player       │  4. Phase check (DANCING only)
  │                                      │  5. Apply move to authoritative state
  │◄─── game:state ──────────────────    │  6. Broadcast new state to all
  │     { players: [...] }               │
  │  [Reconciliation]                    │
  │  If local pos ≠ server pos,          │
  │  snap back to server pos             │
  │                                      │
  │         [20 ticks/second]            │
  │         [Game loop on server]        │
  │         [State sent to all]          │
```

---

## Performance Notes

| Concern          | Solution                                             |
| ---------------- | ---------------------------------------------------- |
| 144 blocks       | `InstancedMesh` — 1 draw call total                  |
| Player updates   | Interpolation — no jitter at 20 ticks/s              |
| React re-renders | Zustand selectors — only affected components update  |
| Particle effects | Object pooling — max 500 reused particles            |
| Audio            | Web Audio API — no DOM elements                      |
| Network          | Delta state — only changed fields sent when possible |

---

## Environment Variables

| Variable                 | Location              | Example                 |
| ------------------------ | --------------------- | ----------------------- |
| `NEXT_PUBLIC_SERVER_URL` | `.env.local` (client) | `http://localhost:3001` |
| `PORT`                   | `.env` (server)       | `3001`                  |
| `CLIENT_ORIGIN`          | `.env` (server)       | `http://localhost:3000` |
| `NODE_ENV`               | System / CI           | `production`            |

---

*Built with ❤️ using Next.js, React Three Fiber, Fastify & Socket.io*
