# 🎵 Musical Blocks

> A multiplayer voxel rhythm game — Block Party clone built with Next.js, React Three Fiber, and Socket.io.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)
![Three.js](https://img.shields.io/badge/Three.js-r184-000000?logo=three.js)
![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?logo=fastify)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io)

---

## How to Play

1. Players join a room and wait in the lobby.
2. The game starts — a colorful 12×12 block grid appears.
3. **Dance phase**: players move around the grid freely.
4. **Announcement**: the server picks a winning color.
5. **Elimination**: all blocks of other colors fall away.
6. Players standing on eliminated blocks fall and are **out**.
7. Each round gets shorter. Last player standing wins!

---

## Project Structure

```
MusicalGame/
├── musical-blocks-client/   # Next.js 16 + React Three Fiber
├── musical-blocks-server/   # Fastify 5 + Socket.io (authoritative server)
└── shared/                  # Shared TypeScript types
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
- [x] Define `BlockColor` union type (RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE)
- [x] Define `Player` interface (id, name, position `{x, z}`, isAlive, isReady, isHost, color)
- [x] Define `GameBlock` interface (row, col, color, isActive)
- [x] Define `GamePhase` union type (LOBBY | DANCING | ANNOUNCING | ELIMINATING | ROUND_END | GAME_OVER)
- [x] Define `GameState` interface (phase, round, timeLeft, winnerColor, blocks[][], players[], winnerId)
- [x] Define `Room` + `RoomSummary` interfaces (id, visibility, status, players, maxPlayers, hostId)
- [x] Define `ServerEvents` type map (all server → client events)
- [x] Define `ClientEvents` type map (all client → server events)
- [x] Define shared constants: `GRID_SIZE`, `MAX_PLAYERS`, `COLOR_HEX`, `PLAYER_COLORS`, `ROUND_DURATIONS`

#### 1.2 Fastify Server Entry Point (`src/index.ts`)
- [x] Initialize Fastify instance with logger enabled (pino-pretty)
- [x] Register `@fastify/cors` plugin for cross-origin requests
- [x] Attach Socket.io server to Fastify's `httpServer` via `io.attach()` in `onReady` hook
- [x] Configure Socket.io CORS: allow `http://localhost:3000`
- [x] Add health-check route `GET /health` → `{ status: 'ok', ts: timestamp }`
- [x] Add `GET /rooms` REST route for public room list
- [x] Start server on port `3001`
- [ ] Export server instance for testing

#### 1.3 Game Room (`src/game/GameRoom.ts`)
- [x] Implement `GameRoom` class with `roomId`, `players`, `grid`, `loop`
- [x] Method `addPlayer(socketId, name): boolean` — validates max 8 players
- [x] Method `removePlayer(socketId): void` — handles host promotion, triggers game over if needed
- [x] Method `buildState(): GameState` — returns current immutable snapshot
- [x] Method `startGame(requesterId)` — host-only, validates min 2 players
- [x] Method `handlePlayerMove()` — delegates to PlayerManager with phase guard
- [x] Implement `GridManager` — generates 12×12 random color grid per round
- [x] `GridManager.generate()` — assigns random `BlockColor` to each cell
- [x] `GridManager.eliminate(winnerColor)` — returns array of `{row, col}` removed
- [x] `GridManager.isBlockActive(pos)` — used by PlayerManager death detection
- [x] Room `status` property: `'waiting' | 'playing' | 'finished'`
- [x] `GameRoom.generateCode()` — 4-letter code (avoids I/O confusion)

#### 1.4 Round Manager (`src/game/RoundManager.ts`)
- [x] Round logic integrated directly into `GameLoop.ts` (simpler, avoids extra dependency)
- [x] `ROUND_DURATIONS` constant in `shared/types.ts`: `[30, 25, 20, 15, 12, 10, 8, 8]`
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
  - [x] Reject if lag > 200ms or timestamp in future (uses `LAG_TOLERANCE_MS` constant)
  - [x] Reject if rate-limited (< 100ms since last move via `MOVE_RATE_LIMIT_MS` constant)
  - [x] Reject if new position out of grid bounds (0–11)
- [x] Implement `applyMove(playerId, dir): GridPosition` — applies direction
- [x] Implement `checkDeaths(grid): string[]` — returns IDs of players on eliminated blocks
- [x] Implement `getAlive(): Player[]` and `getAll(): Player[]`
- [x] Implement `getWinner(): Player | null` — returns last alive player
- [x] Implement `resetForRound()` — revives all players with spread spawn positions
- [x] `generateSpawnPositions()` — even distribution across the 12×12 grid

#### 1.7 Socket.io Handlers (`src/socket/handlers.ts`)
- [x] Handle `connection` — log socket ID
- [x] Handle `room:create` — validates name, creates public/private room, host assigned
- [x] Handle `room:join_public` — auto-matches to existing room or creates new public one
- [x] Handle `room:join_private` — joins by 4-letter code with error messages
- [x] Handle `room:leave` — removes from room, schedules cleanup if empty
- [x] Handle `player:ready` — toggles ready state, broadcasts `room:updated`
- [x] Handle `host:start_game` — host-only start, validates min 2 players
- [x] Handle `player:move` — delegates to `GameRoom.handlePlayerMove()` with all validations
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
- [x] Actions: `setGameState`, `setPhase`, `updateBlocks`, `setWinnerColor`, `markPlayerDead`
- [x] Local player slice: `localPlayerId`, `localPlayerName`, `screen` navigation state
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
- [x] Phase guard: only allow input during `DANCING` phase
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
- [x] Distinguish local player (gold name label + eye plane)

#### 2.7 Game Canvas (`src/components/canvas/GameCanvas.tsx`)
- [x] `<Canvas>` with `shadows`, `camera={{ position: [0, 18, 14], fov: 50 }}`
- [x] Lighting: `ambientLight` + `directionalLight` (shadows) + `pointLight`
- [x] Atmosphere: `<Stars>` + `<fog>` + `<Environment preset="night">`
- [x] Include `<BlockGrid>`, `<PlayerMesh>` list, and base platform
- [x] Dynamic import (no SSR) to avoid browser-only API errors

#### 2.8 HUD Components
- [x] `GameHUD.tsx` — Timer, winner color swatch, player list, and round banner
- [x] Timer: red pulsing animation when < 5s
- [x] Color indicator: large block + glow effect during ANNOUNCING
- [x] Player list: alive/dead status + skull icons
- [x] Round banner: "⚡ Round X — Survive!" popping animation

#### 2.9 UI Screens
- [x] `LobbyScreen.tsx` — Premium dark glassmorphism, Quick Join, Create/Join Private
- [x] `RoomLobby.tsx` — Waiting room, player cards, Host Start button, code copy
- [x] `EndScreens.tsx` — GameOver (Spectating) + WinnerScreen (Confetti CSS)
- [x] Transitions: Framer-like CSS animations for all UI elements

---

### 🎨 Phase 3 — Visual Polish & Audio

#### 3.1 Voxel Aesthetics
- [x] Stars/particles in background using `<Stars>` from drei
- [x] Ground platform: solid base platform below grid (`#1a1a2e` Lambert material)
- [x] Fog: `<fog>` atmospheric depth
- [x] `<Environment preset="night">` for reflections
- [x] Block borders: thin `LineSegments` overlay for Minecraft-style edge lines (done via procedural CanvasTexture)
- [x] Block faces: distinct top/side colors (lighter top, darker sides) via vertex colors (done implicitly via Lambert + directional light)

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
- [ ] HUD adapts to portrait/landscape via CSS media queries
- [ ] Prevent default touch scroll on Canvas element

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
- [ ] URL-based room join: parse `?room=` on load, auto-join if room exists

---

### 🟫 Phase 4.5 — Blockbench: Player Model & Animations

> Create the voxel player model in Blockbench and export it as `.glb` for use with `useGLTF` in R3F.

#### 4.5.1 Model Creation (Blockbench)
- [ ] Install [Blockbench](https://www.blockbench.net/) (free, desktop app)
- [ ] Create new **Generic Model** project (`File → New → Generic Model`)
- [ ] Set project unit size to `16px` (Minecraft-scale reference)
- [ ] Build body parts as separate groups:
  - [ ] `Body` — 8×12×4 px box (torso)
  - [ ] `Head` — 8×8×8 px box (attached on top of Body)
  - [ ] `LeftArm` + `RightArm` — 4×12×4 px boxes (sides of torso)
  - [ ] `LeftLeg` + `RightLeg` — 4×12×4 px boxes (below torso)
- [ ] Apply UV texture (16×32 px PNG, Minecraft skin format)
  - [ ] Paint base skin color per group face in the UV editor
  - [ ] Add simple face: 2 eyes (dark pixels) on Head front face
- [ ] Pivot points: set each limb pivot at its connection to the body for correct rotation

#### 4.5.2 Animations (Blockbench)
- [ ] Open **Animate** tab (top menu)
- [ ] Create animation: `idle` (looping)
  - [ ] LeftArm: rotate X from `0°` to `10°` and back (0.0s → 0.5s → 1.0s)
  - [ ] RightArm: opposite phase (10° → 0° → 10°)
  - [ ] Body: subtle Y bob `+0.3` units up/down
  - [ ] Loop: set to `true`, length: `1.0s`
- [ ] Create animation: `walk` (looping)
  - [ ] LeftArm + RightLeg swing forward (`-30°` to `+30°`)
  - [ ] RightArm + LeftLeg opposite phase
  - [ ] Body: slight Y bob
  - [ ] Loop: `true`, length: `0.6s`
- [ ] Create animation: `death` (one-shot)
  - [ ] Whole model: rotate Z from `0°` to `90°` (fall sideways) over `0.4s`
  - [ ] Scale: Y from `1` to `0` over `0.3s` starting at `0.2s`
  - [ ] Loop: `false`
- [ ] Create animation: `celebrate` (looping, shown on winner)
  - [ ] Body: Y bounce `+0.5` units, fast (0.3s loop)
  - [ ] LeftArm + RightArm: raise both up (`-120°` X rotation)

#### 4.5.3 Export
- [ ] `File → Export → Export glTF/GLB` → save as `public/models/player.glb`
- [ ] Verify GLB includes embedded animations (open in [gltf.report](https://gltf.report/))
- [ ] Optimize with `gltf-pipeline`: `npx gltf-pipeline -i player.glb -o player.glb --draco.compressionLevel 7`

#### 4.5.4 Integration in R3F (`PlayerMesh.tsx`)
- [ ] Replace `BoxGeometry` character with `useGLTF('/models/player.glb')`
- [ ] Use `useAnimations(animations, ref)` from `@react-three/drei`
- [ ] Play `walk` animation during `DANCING` phase
- [ ] Play `idle` animation during `LOBBY` / `ANNOUNCING` phases
- [ ] Play `death` animation when `player.isAlive === false`
- [ ] Play `celebrate` animation when `player.id === winnerId`
- [ ] Apply player color as `MeshLambertMaterial` override on the GLB mesh
- [ ] `<Clone>` or `<primitive>` pattern to reuse one GLB for all players

---

### 🔒 Phase 5 — Anti-Cheat & Security

- [ ] Rate limit Socket.io connections: max 10 connections/IP/minute
- [x] Validate all incoming events on server — never trust client data
- [x] Sanitize player name: alphanumeric + accents, 2–16 chars, server-side
- [x] Reject moves outside current grid bounds server-side (0–11)
- [x] Reject moves during non-DANCING phases
- [x] Reject moves with lag > 200ms or timestamp in the future
- [x] Rate-limit moves: reject if < 100ms since last move per player
- [x] Server-side phase enforcement: host:start ignored if game already running
- [ ] Log suspicious activity to file with `pino` transport
- [ ] Implement basic HMAC token per session to prevent spoofed socketIds

---

### 🧪 Phase 6 — Testing

- [ ] Install test dependencies: `vitest`, `@testing-library/react`, `jsdom`
- [ ] Unit test: `GridManager.generate()` — verify 144 blocks, 6 colors, valid distribution
- [ ] Unit test: `GridManager.eliminate(color)` — verify correct blocks marked inactive
- [ ] Unit test: `PlayerManager.validateMove()` — all invalid cases rejected
- [ ] Unit test: `RoundManager.getDanceDuration()` — verify clamping at max index
- [ ] Unit test: `RoundManager.pickWinnerColor()` — returns only colors with ≥1 active block
- [ ] Integration test: full round cycle (LOBBY → DANCING → ANNOUNCING → ELIMINATING → ROUND_END)
- [ ] Integration test: player death detection after elimination
- [ ] Integration test: 2-player game ends correctly when 1 survives
- [ ] Client test: `BlockGrid` renders correct InstancedMesh count (144)
- [ ] Client test: `usePlayerInput` emits correct socket event on keydown
- [ ] E2E test (Playwright): 2 browsers connect, play a full game round

---

### 🚀 Phase 7 — Deployment

#### 7.1 Server (Railway / Render)
- [ ] Add `Dockerfile` for server:
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --omit=dev
  COPY dist/ ./dist/
  CMD ["node", "dist/index.js"]
  ```
- [ ] Add `npm run build` script: `"build": "tsc --project tsconfig.json"`
- [ ] Configure `tsconfig.json` `outDir: "dist"`, `rootDir: "src"`
- [ ] Set environment variables: `PORT`, `CLIENT_ORIGIN`, `NODE_ENV`
- [ ] Add `railway.json` or `render.yaml` deployment config
- [ ] Verify WebSocket support is enabled on hosting platform
- [ ] Configure health check: `GET /health` → used by platform restart policy
- [ ] Set up PM2 or equivalent for crash recovery on VPS

#### 7.2 Client (Vercel)
- [ ] Set `NEXT_PUBLIC_SERVER_URL` env var pointing to deployed server
- [ ] Replace hardcoded `localhost:3001` with `process.env.NEXT_PUBLIC_SERVER_URL`
- [ ] Add `vercel.json` for custom headers if needed
- [ ] Configure `next.config.ts` for production optimization
- [ ] Enable Vercel Analytics
- [ ] Test production build locally: `npm run build && npm run start`
- [ ] Deploy to Vercel via GitHub integration

#### 7.3 DNS & HTTPS
- [ ] Ensure server URL uses `https://` and `wss://` in production
- [ ] Configure CORS on server to allow only production client origin
- [ ] Add SSL certificate to server (handled by Railway/Render automatically)

---

### 📦 Phase 8 — Polish & Future Features

- [ ] Spectator mode: dead players can watch the game
- [ ] Leaderboard: track wins per session with in-memory counter
- [ ] Chat: simple text chat during LOBBY phase
- [ ] Custom skins: player name color selection in lobby
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

| Concern | Solution |
|---|---|
| 144 blocks | `InstancedMesh` — 1 draw call total |
| Player updates | Interpolation — no jitter at 20 ticks/s |
| React re-renders | Zustand selectors — only affected components update |
| Particle effects | Object pooling — max 500 reused particles |
| Audio | Web Audio API — no DOM elements |
| Network | Delta state — only changed fields sent when possible |

---

## Environment Variables

| Variable | Location | Example |
|---|---|---|
| `NEXT_PUBLIC_SERVER_URL` | `.env.local` (client) | `http://localhost:3001` |
| `PORT` | `.env` (server) | `3001` |
| `CLIENT_ORIGIN` | `.env` (server) | `http://localhost:3000` |
| `NODE_ENV` | System / CI | `production` |

---

*Built with ❤️ using Next.js, React Three Fiber, Fastify & Socket.io*
