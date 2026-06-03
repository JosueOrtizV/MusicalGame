# Guía de Pruebas - Fase 6 (Testing) 🧪

¡Hola! Esta guía detalla exactamente el estado de las pruebas, los errores encontrados (y corregidos) y qué debes hacer paso a paso en esta fase tanto en el **servidor** como en el **cliente**.

---

## 1. Estado del Servidor (`musical-blocks-server`)

### ❌ El Error que viste:
El test `Game Over should trigger if <= 1 players survive the ELIMINATING phase` fallaba porque los jugadores (`P1` y `P2`) se posicionaban de forma aleatoria al inicializarse. A veces `P1` (que se supone debía ganar) aparecía sobre una casilla eliminada y moría también, lo que hacía que no hubiera ganadores (`[null, null]`).

### ⚙️ Solución Aplicada:
Hemos corregido [GameLoop.test.ts](file:///d:/Proyectos/MusicalGame/musical-blocks-server/src/game/GameLoop.test.ts) para:
1. Ubicar de forma explícita a **P1** en una posición específica (`{ x: 1, z: 1 }`).
2. Ubicar de forma explícita a **P2** en `{ x: 0, z: 0 }`.
3. Forzar que la casilla debajo de **P1** sea del color ganador (`winnerColor`) y la de **P2** sea de otro color.

### 🚀 Tu Acción en el Servidor:
¡Ya está todo listo! Solo vuelve a correr el comando en la carpeta `musical-blocks-server`:
```bash
npm run test
```
Deberías ver que ahora los **25 tests pasan con éxito** (100% verde) en unos milisegundos.

---

## 2. Estado del Cliente (`musical-blocks-client`)

### ❌ El Error que viste:
`npm error Missing script: "test"`
Esto ocurre porque el cliente de Next.js aún no tiene configurado **Vitest** ni tiene el comando de testing agregado a su `package.json`.

---

## 3. ¿Qué debes hacer en el Cliente? (Paso a Paso)

Si quieres realizarlo tú mismo o ver cómo se hace, estos son los pasos detallados. Si lo deseas, **yo puedo hacer toda esta configuración por ti de forma automática**:

### Paso 2.1: Instalar las dependencias de Testing en el cliente
En la carpeta `musical-blocks-client`, debes instalar las dependencias de Vitest y utilidades de renderizado DOM:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Paso 2.2: Configurar `package.json`
Debes abrir el archivo [package.json](file:///d:/Proyectos/MusicalGame/musical-blocks-client/package.json) del cliente y agregar el script `"test"`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
}
```

### Paso 2.3: Crear `vitest.config.ts`
En la raíz de la carpeta `musical-blocks-client`, se debe crear un archivo de configuración para mapear las rutas relativas (ej. `@/` a `./src`) y definir el entorno del navegador simulado (`jsdom`):
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Paso 2.4: Escribir las pruebas para el Store de Zustand y Utilidades
1. **Pruebas de utilidades de color** en `src/components/ui/utils.test.ts`:
   - Validar que la función `hexToRgba` convierta correctamente colores hexadecimales a formato RGBA, manejando opacidades y fallbacks si el color es inválido.
2. **Pruebas del Store Zustand** en `src/stores/gameStore.test.ts`:
   - Validar que las acciones modifiquen el estado correctamente (ej. cambio de idioma, muteo de música, guardar cosméticos locales en `localStorage`).

### Paso 2.5: Ejecutar los tests en el Cliente
Una vez configurado todo, podrás correr:
```bash
npm run test
```
En la carpeta `musical-blocks-client` para verificar que todo funcione.

---

## 4. ¿Deseas que yo lo configure y cree los tests por ti?

Dime si deseas que:
1. **Instale las dependencias y configure el cliente** con Vitest.
2. **Escriba los archivos de pruebas necesarios** (`gameStore.test.ts` y `utils.test.ts`).
3. **Ejecute y valide que todo quede al 100%**.
