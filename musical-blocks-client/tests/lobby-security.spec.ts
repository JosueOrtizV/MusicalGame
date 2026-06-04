import { test, expect, chromium } from '@playwright/test';

test.describe('VoxelRave Lobby E2E Security Tests', () => {

  test('Debería crear una sala y cambiar de pantalla', async ({ page }) => {
    await page.goto('/');
    
    // Ingresar alias
    await page.fill('#player-name', 'HostPlayer');
    
    // Crear sala privada
    await page.click('button.lobby-btn--secondary'); // "Crear Mesa Privada"
    
    // Verificar que navega al lobby y muestra el código de sala de 4 letras
    await expect(page.locator('.room-title')).toBeVisible();
    await expect(page.locator('.room-code-text')).toBeVisible();
    
    const code = await page.locator('.room-code-text').textContent();
    expect(code).not.toBeNull();
    expect(code?.trim().length).toBe(4);
  });

  test('Debería bloquear cancelaciones de inicio excedido el límite de 3 veces (Host)', async ({ page }) => {
    // Abrir un segundo contexto para el invitado
    const browser = await chromium.launch();
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    // 1. Host crea la sala
    await page.goto('/');
    await page.fill('#player-name', 'HostPlayer');
    await page.click('button.lobby-btn--secondary');
    
    // Obtener código de sala
    await page.waitForSelector('.room-code-text');
    const roomCode = (await page.locator('.room-code-text').textContent())?.trim();
    expect(roomCode).toBeDefined();
    expect(roomCode?.length).toBe(4);

    // 2. Invitado se conecta a la sala mediante URL directa
    await guestPage.goto(`/?room=${roomCode}`);
    await guestPage.fill('#player-name', 'GuestPlayer');
    await guestPage.click('button.lobby-btn--primary'); // Botón de unirse en el prompt directo

    // Esperar a que el Invitado se una al lobby
    await expect(guestPage.locator('.room-title')).toBeVisible();
    await expect(guestPage.locator('#btn-ready')).toBeVisible();

    // 3. El Invitado marca Listo (el Host ya está listo por defecto)
    await guestPage.click('#btn-ready');

    // Esperar a que el Host sincronice el Ready y su botón se habilite
    const hostStartBtn = page.locator('#btn-start');
    await expect(hostStartBtn).toBeEnabled();

    // 4. Probar cancelaciones manuales del Host
    // Cancelación 1:
    await hostStartBtn.click(); // Iniciar
    await expect(hostStartBtn).toHaveText(/(Cancelar|Cancel)/); // Esperar a que cambie el texto
    await hostStartBtn.click(); // Cancelar

    // Cancelación 2:
    await hostStartBtn.click();
    await expect(hostStartBtn).toHaveText(/(Cancelar|Cancel)/);
    await hostStartBtn.click();

    // Cancelación 3:
    await hostStartBtn.click();
    await expect(hostStartBtn).toHaveText(/(Cancelar|Cancel)/);
    await hostStartBtn.click();

    // Al iniciar el 4º intento de inicio:
    await hostStartBtn.click();
    
    // Verificar que el botón "Cancelar" ahora está bloqueado o deshabilitado
    // y muestra "Inicio Inevitable" o "Starting Soon" en el Host
    await expect(hostStartBtn).toBeDisabled();
    
    const buttonText = await hostStartBtn.textContent();
    expect(buttonText).toMatch(/(Inicio Inevitable|Starting Soon)/);

    await guestContext.close();
    await browser.close();
  });

  test('Debería expulsar al host por AFK e inactividad en el lobby', async ({ page }) => {
    // 1. Host crea la sala con un alias especial que acelera el AFK check en el backend
    await page.goto('/');
    await page.fill('#player-name', 'HostAFKTest');
    await page.click('button.lobby-btn--secondary');
    
    await expect(page.locator('.room-title')).toBeVisible();

    // 2. No hacer nada por 6 segundos (el límite AFK del host con HostAFKTest es 4s)
    // Esperar a que ocurra la expulsión por inactividad
    await page.waitForTimeout(6000);

    // 3. Verificar que el host es expulsado por AFK al menú principal y el formulario de alias se muestra
    await expect(page.locator('#player-name')).toBeVisible();
  });

  test('Debería cerrar la sala por Lobby Timeout (6s en test)', async ({ page }) => {
    // 1. Host crea la sala con un alias especial que acelera el Lobby Timeout check en el backend
    await page.goto('/');
    await page.fill('#player-name', 'HostTimeoutTest');
    await page.click('button.lobby-btn--secondary');
    
    await expect(page.locator('.room-title')).toBeVisible();

    // 2. Dejar la sala abierta sin iniciar el juego durante 8 segundos
    // (el lobby timeout con HostTimeoutTest es de 6s)
    await page.waitForTimeout(8000);

    // 3. Verificar que la sala se cierra y el host es expulsado al menú principal
    await expect(page.locator('#player-name')).toBeVisible();
  });
});
