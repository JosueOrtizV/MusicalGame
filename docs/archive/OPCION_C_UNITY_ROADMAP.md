# 🎮 Opción C: Migración a Unity — Roadmap para Steam y Google Play Store

> **Documento de planificación a largo plazo**  
> Este roadmap describe la estrategia completa para llevar VoxelRave de su versión web actual (React + Three.js + Socket.io) a un juego nativo publicable en **Google Play Store** y **Steam** usando **Unity**.

---

## 📌 Contexto y Decisión Estratégica

### ¿Por qué Unity y no Godot/Unreal?

| Criterio | Unity | Godot | Unreal |
|---|---|---|---|
| **Multiplayer nativo** | ✅ Netcode for GameObjects, Mirror, Photon | ⚠️ Limitado, manual | ✅ Excelente pero overkill |
| **Mobile performance** | ✅ Excelente, IL2CPP | ✅ Bueno pero menos optimizado | ❌ Muy pesado para mobile |
| **Voxel art / low-poly** | ✅ Perfecto para este estilo | ✅ Bien | ⚠️ Overkill |
| **Steam + Play Store** | ✅ Un clic export | ✅ Un clic export | ✅ Un clic export |
| **AI coding assist** | ✅ C# tiene excelente soporte | ⚠️ GDScript tiene menos | ✅ C++ tiene buen soporte |
| **Asset Store** | ✅ Enorme ecosistema | ⚠️ Pequeño | ✅ Grande |
| **Curva de aprendizaje** | 🟡 Media | 🟢 Baja | 🔴 Alta |
| **Costo** | Free hasta $200K ingresos | 100% Free | 5% royalties después de $1M |

**Veredicto**: Unity es la mejor opción para un juego multiplayer 3D estilo voxel que necesita publicarse en PC (Steam) y mobile (Play Store) con excelente rendimiento.

---

## 🗓️ Plan en Dos Fases

```
┌──────────────────────────────────────────────────────────────────────┐
│  FASE 1: Prototipo Web Fluido (Opción B)                           │
│  ✦ 15-25 horas                                                      │
│  ✦ Mejoras de movimiento en el código web actual                    │
│  ✦ Testear con amigos, validar gameplay                              │
│  ✦ ← ESTÁS AQUÍ                                                     │
├──────────────────────────────────────────────────────────────────────┤
│  FASE 2: El Juego Definitivo en Unity (Opción C)                    │
│  ✦ 200-300+ horas                                                    │
│  ✦ Reconstrucción desde cero con movimiento libre 3D real           │
│  ✦ Publicación en Steam + Google Play Store                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Fase 2: Migración a Unity — Desglose Completo

### Etapa 1: Configuración Inicial (~10-15h)

#### 1.1 Setup del Proyecto Unity
- [ ] Instalar Unity Hub + Unity 6 LTS (última estable)
- [ ] Crear proyecto con template **3D (URP)** — Universal Render Pipeline para mobile
- [ ] Configurar **Build targets**: Android + Windows (Steam)
- [ ] Estructura de carpetas:
  ```
  Assets/
  ├── Scripts/
  │   ├── Core/        (GameManager, GameState, GamePhase)
  │   ├── Network/     (NetworkManager, SocketClient, Sync)
  │   ├── Player/      (PlayerController, PlayerAnimator, PlayerCosmetics)
  │   ├── Arena/       (BlockGrid, BlockManager, ArenaManager)
  │   ├── Camera/      (ThirdPersonCamera, CinematicCamera)
  │   ├── UI/          (HUD, Lobby, MainMenu, Settings)
  │   ├── Audio/       (MusicManager, SFXManager, BeatSync)
  │   └── Utils/       (Constants, Helpers)
  ├── Prefabs/
  │   ├── Player/
  │   ├── Blocks/
  │   └── VFX/
  ├── Models/          (Voxel player .glb, blocks)
  ├── Materials/
  ├── Textures/
  ├── Audio/
  │   ├── Music/
  │   └── SFX/
  ├── Scenes/
  │   ├── MainMenu
  │   ├── Lobby
  │   └── Game
  └── Plugins/         (NativeWebSocket, etc.)
  ```

#### 1.2 Importar Assets Existentes
- [ ] Exportar `player.glb` del proyecto web → importar a Unity
- [ ] Extraer todas las canciones/SFX
- [ ] Convertir paleta de colores (`COLOR_HEX`, `PLAYER_COLORS`) a `ScriptableObject`
- [ ] Recrear texturas de bloques voxel como materiales URP

---

### Etapa 2: Servidor Multiplayer (~30-40h)

#### 2.1 Decisión de Arquitectura de Red

> **Opción recomendada**: Mantener el servidor Node.js + Socket.io existente y conectar Unity al mismo servidor.

**¿Por qué?** Tu servidor ya tiene:
- Toda la lógica de juego (GameRoom, GameLoop, GridManager, PlayerManager)
- Validación autoritativa anti-cheat
- Rate limiting, HMAC tokens
- Chat, rooms, matchmaking

Reescribir todo esto en C# sería un desperdicio de ~50+ horas de trabajo ya hecho.

#### 2.2 Cliente Socket.io en Unity
- [ ] Integrar **NativeWebSocket** o **socket.io-client-csharp** como plugin
- [ ] Crear `NetworkManager.cs`:
  ```csharp
  public class NetworkManager : MonoBehaviour {
      private SocketIOClient socket;
      
      // Mismos eventos que el cliente web:
      // room:create, room:join_public, room:join_private
      // player:move, player:ready, game:state, etc.
  }
  ```
- [ ] Serialización JSON idéntica a los tipos en `shared/types.ts`
- [ ] Clock sync (ping/pong) igual al actual
- [ ] Session token HMAC management

#### 2.3 Protocolo Nuevo: Movimiento Libre

Aquí es donde Unity diverge del web. El `player:move` cambiará de:
```typescript
// Web actual
{ direction: 'UP', timestamp: number }
```
A:
```typescript
// Unity nuevo
{ position: { x: float, y: float, z: float }, 
  velocity: { x: float, z: float },
  rotation: float,
  timestamp: number }
```

Esto requiere **actualizar el servidor** para:
- [ ] Nuevo handler `player:move_free` (mantener el viejo para compatibilidad web)
- [ ] **Server-side position validation** en vez de direction validation
- [ ] Detección de "en qué bloque estoy" usando coordenadas continuas:
  ```typescript
  function getBlockAt(worldX: number, worldZ: number): GridPosition {
    const col = Math.round((worldX + halfGrid) / BLOCK_SIZE);
    const row = Math.round((worldZ + halfGrid) / BLOCK_SIZE);
    return { x: clamp(col, 0, GRID_SIZE-1), z: clamp(row, 0, GRID_SIZE-1) };
  }
  ```
- [ ] Anti-cheat: speed validation (max distance per tick)
- [ ] Entity interpolation data para otros clientes

---

### Etapa 3: Player Controller 3D (~25-35h)

#### 3.1 Movimiento Libre con Física
- [ ] `PlayerController.cs` con CharacterController o Rigidbody:
  ```csharp
  public class PlayerController : MonoBehaviour {
      [SerializeField] float moveSpeed = 5f;
      [SerializeField] float jumpForce = 8f;
      [SerializeField] float gravity = -20f;
      [SerializeField] float dashSpeed = 15f;
      [SerializeField] float dashDuration = 0.2f;
      
      private CharacterController controller;
      private Vector3 velocity;
      private bool isGrounded;
      
      void Update() {
          // Input from joystick/keyboard
          float h = Input.GetAxisRaw("Horizontal");
          float v = Input.GetAxisRaw("Vertical");
          
          // Camera-relative movement
          Vector3 camForward = Camera.main.transform.forward;
          Vector3 camRight = Camera.main.transform.right;
          camForward.y = 0; camRight.y = 0;
          
          Vector3 moveDir = (camForward * v + camRight * h).normalized;
          controller.Move(moveDir * moveSpeed * Time.deltaTime);
          
          // Gravity
          if (isGrounded && velocity.y < 0) velocity.y = -2f;
          velocity.y += gravity * Time.deltaTime;
          controller.Move(velocity * Time.deltaTime);
          
          // Jump
          if (Input.GetButtonDown("Jump") && isGrounded) {
              velocity.y = jumpForce;
          }
      }
  }
  ```

#### 3.2 Client-Side Prediction
- [ ] Almacenar historial de inputs con timestamps
- [ ] Al recibir corrección del servidor, replay inputs desde el último estado confirmado
- [ ] Threshold de corrección (~0.1 unidades) para evitar snapping visible

#### 3.3 Entity Interpolation (Otros Jugadores)
- [ ] Buffer de estados recibidos (3 snapshots)
- [ ] Interpolar posición entre snapshot[n-1] y snapshot[n] con delay de 100ms
- [ ] Suavizar rotación del personaje

#### 3.4 Animaciones
- [ ] Importar las 6 animaciones del .glb:
  - `idle`, `idle2`, `walk`, `dance`, `dance2`, `dance3`, `dance4`, `celebrate`, `celebrate2`, `death`
- [ ] Animator Controller con blend tree:
  ```
  Idle ←→ Walk (speed > 0.1)
  Walk ←→ Run (speed > 3.0)
  Any → Dance (phase == DANCING && !isMoving)
  Any → Death (isAlive == false)
  Any → Celebrate (phase == GAME_OVER && isWinner)
  Any → Jump (isJumping)
  ```
- [ ] Configurar Root Motion vs. Script-driven motion

---

### Etapa 4: Arena y Bloques (~15-20h)

#### 4.1 Grid de Bloques
- [ ] Prefab de bloque con material URP + voxel texture
- [ ] `BlockGrid.cs` — instanciar 144 bloques con GPU instancing
- [ ] Colores dinámicos via `MaterialPropertyBlock` (no clona materiales)
- [ ] Animación de eliminación: bloques caen con Rigidbody + gravedad (no necesitas simular, solo activar physics)

#### 4.2 Stage Show
- [ ] Recrear spotlights volumétricos con URP
- [ ] Neon lasers con LineRenderer
- [ ] Beat-sync system con la música

#### 4.3 Partículas
- [ ] Unity Particle System para:
  - Dust trails al caminar
  - Burst de eliminación
  - Confetti de victoria
  - Fireworks voxelados

---

### Etapa 5: Cámara 3D (~10-15h)

#### 5.1 Third-Person Camera
- [ ] **Cinemachine** (incluido en Unity 6):
  ```
  CinemachineFreeLook:
    Follow: LocalPlayer
    LookAt: LocalPlayer
    Top Rig: Height=10, Radius=3
    Middle Rig: Height=5, Radius=6
    Bottom Rig: Height=1, Radius=4
  ```
- [ ] Input mobile: dedo derecho rota cámara
- [ ] Input PC: mouse move rota, scroll zoom
- [ ] Collision con paredes/bloques (Cinemachine Collider)

#### 5.2 Cámaras Cinematográficas
- [ ] Cinemachine Dolly Track para intro (STARTING phase)
- [ ] Orbit camera para lobby
- [ ] Victory celebration camera

---

### Etapa 6: UI/UX (~20-30h)

#### 6.1 Sistema de UI
- [ ] **Unity UI Toolkit** (recomendado) o **Canvas + TextMeshPro**
- [ ] Pantallas:
  - Main Menu (logo, play, settings)
  - Lobby (player list, ready, settings, chat)
  - In-Game HUD (timer, round, lives, color indicator)
  - Death spectator overlay
  - Victory celebration
  - Settings (audio, controls, language)

#### 6.2 Controles Mobile
- [ ] **Joystick virtual** con dead zone y 360° (no 8 direcciones limitadas)
- [ ] **Botón de salto** grande en esquina derecha
- [ ] **Botón de dash** con cooldown visual
- [ ] **Touch drag** en zona derecha para cámara
- [ ] Auto-detect input type (touch vs gamepad vs keyboard)

#### 6.3 Chat
- [ ] Chat overlay recreado en Unity UI
- [ ] Emojis rápidos para mobile (reacciones predefinidas)

---

### Etapa 7: Audio (~10-15h)

#### 7.1 Sistema de Audio
- [ ] Migrar sistema de BPM sync y beat pulse
- [ ] `AudioManager.cs` con:
  - Playlist por fase (lobby, dance, winner)
  - Crossfade entre canciones
  - SFX pool para movimiento, eliminación, victoria
  - Beat detection para sync visual

#### 7.2 Adaptive Audio
- [ ] Intensidad de música aumenta en rondas finales
- [ ] Filter pass cuando estás en los últimos segundos del ANNOUNCING
- [ ] Victory stinger + celebration music

---

### Etapa 8: Cosméticos y Personalización (~15-20h)

#### 8.1 Sistema de Cosméticos
- [ ] Migrar `PlayerCosmetics` como `ScriptableObject`:
  - Skin materials (matte, chrome, neon)
  - Headphones toggle
  - Backpack toggle
  - Companion (cassette, floppy, orb)
  - Colors (primary, visor, heart, shoes, etc.)
  - Dance/idle/celebrate style selection

#### 8.2 Tienda (Monetización)
- [ ] **Cosmético-only** (no pay-to-win)
- [ ] Moneda virtual ganada jugando
- [ ] Skins premium comprables
- [ ] Battle Pass por temporada (opcional, futuro)

---

### Etapa 9: Publicación (~20-30h)

#### 9.1 Google Play Store
- [ ] **Requisitos**:
  - Cuenta de desarrollador ($25 USD una vez)
  - Target API Level 34+ (Android 14)
  - App Bundle (.aab) no APK
  - Clasificación de contenido IARC
  - Política de privacidad
  - Screenshots (phone + tablet)
  - Video trailer
- [ ] **Optimización mobile**:
  - LOD para modelos (Level of Detail)
  - Texture compression (ASTC)
  - Target 30 FPS mínimo en dispositivos gama media
  - Battery & thermal throttling handling
  - Adaptive quality settings
- [ ] **Testing**:
  - Internal testing track → Closed testing → Open testing → Production
  - Minimum 20 testers para closed beta

#### 9.2 Steam
- [ ] **Requisitos**:
  - Steamworks account ($100 USD por juego)
  - Steamworks SDK integration
  - Steam Achievements (opcional)
  - Steam Cloud saves (player cosmetics)
  - Trading cards (opcional, futuro)
- [ ] **Store page**:
  - Capsule images (header, small, library)
  - Screenshots mínimo 5
  - Trailer de 1-2 minutos
  - Descripción con features
  - System requirements
- [ ] **Build pipeline**:
  - SteamPipe para upload de builds
  - Beta branch para testing

#### 9.3 Cross-Play
- [ ] Web (Fase 1) + Unity mobile + Unity PC compartiendo el **mismo servidor**
- [ ] Protocolo dual: `player:move` (web grid) + `player:move_free` (Unity libre)
- [ ] Los jugadores web y Unity coexisten en las mismas rooms
- [ ] UI indicator de plataforma junto al nombre del jugador

---

## 💰 Consideraciones de Monetización

### Modelo Recomendado: Free-to-Play con Cosméticos

| Fuente de Ingresos | Descripción | Prioridad |
|---|---|---|
| **Skins premium** | Materiales especiales, colores exclusivos | 🔴 Alta |
| **Companions premium** | Mascotas flotantes con animaciones únicas | 🔴 Alta |
| **Dance emotes** | Bailes exclusivos comprables | 🟡 Media |
| **Battle Pass** | Recompensas por temporada (cosmético-only) | 🟡 Media |
| **Ads (mobile)** | Rewarded ads para moneda virtual | 🟢 Baja (opcional) |

> ⚠️ **NUNCA** vender ventajas gameplay (más vidas, velocidad, etc.)

---

## 📊 Estimación de Tiempo Total

| Etapa | Horas Estimadas | Dificultad |
|---|---|---|
| 1. Setup inicial | 10-15h | 🟢 Fácil |
| 2. Servidor multiplayer | 30-40h | 🔴 Difícil |
| 3. Player Controller 3D | 25-35h | 🔴 Difícil |
| 4. Arena y bloques | 15-20h | 🟡 Media |
| 5. Cámara 3D | 10-15h | 🟡 Media |
| 6. UI/UX | 20-30h | 🟡 Media |
| 7. Audio | 10-15h | 🟡 Media |
| 8. Cosméticos | 15-20h | 🟡 Media |
| 9. Publicación | 20-30h | 🟡 Media |
| **TOTAL** | **155-220h** | — |

> Esto asume un desarrollador trabajando con asistencia de AI (Claude/Cursor). Sin AI, multiplicar por ~1.5x.

---

## 🛠️ Tech Stack Unity Final

```
Unity 6 LTS (URP)
├── Networking:     socket.io-client-csharp → Tu servidor Node.js existente
├── Physics:        Unity CharacterController + Colliders
├── Camera:         Cinemachine FreeLook
├── UI:             UI Toolkit + TextMeshPro
├── Audio:          Unity Audio + custom BeatSync
├── Particles:      Unity Particle System (Shuriken)
├── Animation:      Animator Controller + Blend Trees
├── Input:          New Input System (cross-platform)
├── Mobile:         URP with ASTC textures, LOD, adaptive quality
├── Steam:          Steamworks.NET
└── Play Store:     Unity Android Publisher
```

---

## 🔑 Activos Reutilizables del Proyecto Web

Estos assets y sistemas pueden migrarse directamente:

| Asset/Sistema | Ubicación Web | Reuso en Unity |
|---|---|---|
| Modelo 3D del jugador | `/public/models/player.glb` | Importar directamente |
| 6+ animaciones | Dentro del .glb | Importar con Animator |
| Música (10 tracks) | Sistema Howler.js | Re-exportar .ogg/.mp3 |
| Paleta de colores | `shared/types.ts` → `COLOR_HEX` | ScriptableObject |
| Lógica del servidor | Todo `musical-blocks-server/` | Se reutiliza 100% |
| Protocolo Socket | `shared/types.ts` → Events | Replicar en C# |
| Chat system | Servidor ya lo tiene | Solo UI nueva |
| Room/Lobby logic | Servidor ya lo tiene | Solo UI nueva |
| Anti-cheat (HMAC) | `utils/crypto.ts` | Replicar en C# |

---

## 📅 Timeline Sugerido

```
Semana 1-2:   Fase 1 (Opción B web) — AHORA
Semana 3-4:   Etapa 1 + 2 (Setup Unity + Networking)
Semana 5-8:   Etapa 3 + 4 + 5 (Player + Arena + Camera)
Semana 9-11:  Etapa 6 + 7 (UI + Audio)
Semana 12-13: Etapa 8 (Cosméticos)
Semana 14-16: Etapa 9 (Testing + Publicación)
              ↓
         🎮 LAUNCH en Play Store + Steam
```

---

## Preguntas para Resolver Antes de Empezar Etapa 2

1. **¿Tienes experiencia con C# o Unity?** Esto determinará cuántas horas reales toma.
2. **¿Tu servidor actual corre en la nube (Railway, Render, etc.) o local?** Para producción necesitas un servidor dedicado.
3. **¿Tienes los derechos de la música?** Para publicar en tiendas necesitas licencias o música original/royalty-free.
4. **¿Quieres mantener cross-play web ↔ Unity?** Agrega complejidad pero es muy valioso.
5. **¿Presupuesto para las cuentas de desarrollador?** $25 Play Store + $100 Steam = $125 USD mínimo.

---

*Documento creado como referencia a largo plazo. Actualizar conforme avance el desarrollo.*
