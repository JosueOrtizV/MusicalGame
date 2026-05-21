# 🎮 Musical Blocks — Cliente 3D Premium

> Una experiencia rítmica multijugador interactiva en 3D basada en voxel art. Construido con **Next.js 16 (App Router)**, **React Three Fiber (R3F)**, **Three.js** y **Zustand**.

Este es el cliente interactivo que da vida a **Musical Blocks**, ofreciendo una interfaz visualmente espectacular con estética cyberpunk, animaciones fluidas por código, efectos de post-procesamiento y una física visual altamente optimizada.

---

## ⚡ Tecnologías Core del Cliente

*   **Renderizado 3D**: [React Three Fiber](https://r3f.docs.pmnd.rs/) y `@react-three/drei` para el control de la escena, cámaras y renderizado de mallas instanciadas.
*   **Gestión de Estado**: [Zustand](https://github.com/pmndrs/zustand) con middleware de Immer para actualizaciones inmutables ultrarrápidas a 60 FPS sin re-renders innecesarios en React.
*   **Comunicación en Tiempo Real**: `socket.io-client` con compensación automática de lag y sincronización de reloj con el servidor.
*   **Aparato de Audio**: Sintetizador Web Audio API procedural integrado para efectos especiales y reproducción de música responsiva sin tiempos de carga por archivos pesados.
*   **Estilos y Layout**: CSS nativo premium con Glassmorphism, animaciones de glitch cibernético e interfaz responsive compatible con móviles.

---

## 🤖 Sistema Avanzado de Avatares Voxel 3D

El juego cuenta con un sistema de avatares estilo voxel cibernético implementado con geometría modular jerárquica nativa en Three.js, ofreciendo un alto nivel de expresividad sin depender de recursos externos pesados.

```
       [Cabeza (Visor LED)]
               │
        [Torso Central] ─── (Brazos Izq/Der)
               │
        (Piernas Izq/Der)
```

### 1. Clonación de Esqueletos (Skeleton Cloning)
Para evitar que las transformaciones o animaciones de un jugador afecten visualmente a los demás (crosstalk), cada avatar genera su propia instancia aislada del esqueleto de articulaciones. Esto permite que múltiples jugadores en pantalla ejecuten animaciones en desfases de tiempo únicos de manera totalmente independiente.

### 2. Controlador Inteligente de 6 Animaciones Procedurales
Las animaciones están escritas íntegramente en código matemático dinámico a través de `useFrame`, asegurando transiciones ultra-suaves y adaptativas:
*   **`idle`**: Respiración rítmica y flotación vertical sutil.
*   **`walk`**: Oscilación clásica cruzada de brazos y piernas, adaptada a la velocidad real del jugador.
*   **`dance`**: Movimiento enérgico lateral del torso, elevación de brazos y pequeños saltos sincronizados con el ritmo.
*   **`jump`**: Trayectoria parabólica física con estiramiento elástico al despegar y compresión al aterrizar.
*   **`death`**: Inclinación rotacional progresiva, caída libre hacia el vacío de la arena y encogimiento modular continuo hasta fusionarse con la plataforma eliminada.
*   **`celebrate`**: Giros de alta velocidad sobre el eje Y acompañado de una elevación festiva de brazos alternada.

### 3. Rotación Suavizada (Direction Lerp) y Corrección de Visor
*   Cuando el jugador se mueve, su avatar rota suavemente hacia la dirección del movimiento usando **interpolación esférica (Lerp)** para evitar giros instantáneos e irreales.
*   Se corrigió el visor frontal LED (los "ojos" del avatar) para que apunte perfectamente al frente cuando el avatar camina hacia abajo (`S` o flecha abajo), evitando que el visor mire al lado contrario al retroceder.

### 4. Retorno Inteligente al Baile
El controlador de animación del avatar detecta si el jugador permanece quieto durante **1 segundo** en la fase de baile (`DANCING`). Si es así, interrumpe el estado idle y reactiva automáticamente la animación de baile para mantener la energía de la arena al máximo.

---

## 🏟️ Mecánicas y Pulido de la Arena de Juego

La rejilla de 12×12 bloques instanciados (`THREE.InstancedMesh`) incluye comportamientos físicos y efectos avanzados para elevar la experiencia visual:

### 👁️ Desafío de Memoria en Modo Ciego (Blind Mode)
*   Al activarse, todos los bloques apagan sus colores y se pintan en una tonalidad monocromática grisácea/oscura durante la fase de anuncio.
*   Cada bloque renderiza dinámicamente un **emblema pixelado con un signo de interrogación (`?`)** en su cara superior para retar la memoria fotográfica tridimensional de los jugadores.
*   Se implementó un bloqueo estricto de filtraciones de color durante la transición de fases (`ANNOUNCING`), garantizando que la revelación de bloques sea 100% ciega.

### 🟫 Muerte Súbita Dinámica (Standard & Chaos Mode)
*   **Modo Normal**: Comienza a partir de la Ronda 10, eliminando permanentemente bloques periféricos para reducir el tamaño de la arena.
*   **Modo Caos**: ¡La arena comienza a encogerse desde la Ronda 1! A partir de la Ronda 11, los bloques caen de dos en dos, incrementando la tensión dramáticamente.
*   **Anunciador HUD**: El banner superior detecta la configuración del lobby y despliega el rótulo dinámico animado `"SUDDEN DEATH!"` / `"MUERTE SÚBITA!"` en el momento preciso.

### 📳 Temblores de Último Segundo (Tremor FX)
*   Para evitar el ruido visual molesto de bloques vibrando continuamente, los bloques programados para caer permanecen estables durante la mayor parte del tiempo, comenzando a vibrar y tambalearse **estrictamente durante el último segundo** (`timeLeft <= 1`) del conteo. Esto da una pista visual intuitiva y altamente dramática justo antes del colapso.

### 💡 Separación Física y Emisiva (Flicker Fix)
*   Se desacopló la física del movimiento de los bloques (el efecto de respiración/escala `bobbing`) de los pulsos emisivos de luz.
*   Durante el **Modo Ciego** y la **Muerte Súbita**, el movimiento físico de rebote reactivo se desactiva para mantener una visual estable y limpia.
*   El bloque ganador mantiene su brillo de neón constante aplicando un multiplicador estático sólido (`1.2x`) a su mapa emisivo, solucionando cualquier parpadeo errático e indeseado de luces.

---

## 📱 D-Pad Táctil y Diseño Responsive

*   **Cámara Adaptativa R3F**: Un manejador dinámico ajusta el ángulo, la distancia y el Campo de Visión (FOV) de la cámara 3D de acuerdo al formato de pantalla (Portrait en móviles vs Landscape en escritorio), garantizando que toda la arena sea visible en cualquier dispositivo.
*   **Virtual D-Pad**: Un control táctil integrado en pantalla que emite eventos optimizados de dirección para jugadores en dispositivos móviles sin interrumpir la experiencia visual.
*   **Bloqueo de Gestos**: Desactiva el scroll accidental y gestos nativos del navegador mientras el jugador se encuentra interactuando activamente con la arena 3D.

---

## 🚀 Guía de Inicio Rápido

### Instalación de Dependencias
Asegúrate de estar en el directorio del cliente e instala los paquetes necesarios:
```bash
cd musical-blocks-client
npm install
```

### Ejecutar Servidor de Desarrollo
Inicia el entorno de desarrollo rápido con soporte para Turbopack y recarga en caliente (Hot Reload):
```bash
npm run dev
```

El cliente estará disponible en: [http://localhost:3000](http://localhost:3000).

### Compilación para Producción
Para verificar la integridad del código TypeScript y optimizar los assets 3D:
```bash
npm run build
```

---

## 📋 Panel de Tareas & Próximos Pasos (Pendientes)

A continuación se listan las 4 características críticas de integración de red, seguridad y usabilidad pendientes de implementar para consolidar el flujo final del proyecto:

### 🔗 1. Unirse Mediante Enlace Directo (URL-Based Room Joining)
*   **Estado**: `[ ] Pendiente`
*   **Descripción**: Permitir que los jugadores se unan directamente a salas de juego privadas escaneando o haciendo clic en un enlace que contenga la variable de consulta `?room=CODE`. Al cargar la aplicación, se debe analizar la URL y, si el código existe y es válido, omitir el paso de selección en el lobby y conectarlo automáticamente a la sala indicada.

### 🛡️ 2. Límite de Conexiones por IP (Connection Rate Limiting)
*   **Estado**: `[ ] Pendiente`
*   **Descripción**: Robustecer la capa de comunicación del servidor implementando un middleware de Socket.io que limite la creación de nuevas conexiones a un máximo de **10 conexiones por IP por minuto** para evitar ataques de denegación de servicio (DoS) o spam en salas públicas.

### 📝 3. Registro de Actividad Sospechosa (Suspicious Activity Log)
*   **Estado**: `[ ] Pendiente`
*   **Descripción**: Registrar automáticamente desviaciones extremas de ping/lag (mayores a 2000ms), intentos de envío de comandos durante fases no permitidas o inputs bloqueados por el limitador de tasa de movimiento. Se guardarán en un archivo dedicado utilizando el transporte oficial de `pino` para facilitar auditorías de juego limpio.

### 🔑 4. Firmas Criptográficas de Sesión (HMAC Session Tokens)
*   **Estado**: `[ ] Pendiente`
*   **Descripción**: Implementar firmas criptográficas sencillas basadas en tokens HMAC para asegurar que un `socketId` no pueda ser suplantado o secuestrado maliciosamente en tramas de red personalizadas, garantizando que cada movimiento y estado de ready pertenezca de forma única y segura al cliente emisor original.

---

*Desarrollado con ❤️ para la comunidad de entusiastas de los juegos de ritmo interactivos.*
