'use client';

import React from 'react';
import { useTranslation } from '@/src/hooks/useTranslation';

export function PrivacyClient() {
  const { lang } = useTranslation();
  const isEs = lang === 'es';

  return (
    <article className="prose prose-invert max-w-none flex flex-col gap-6">
      <header className="border-b border-[#00fbfb]/20 pb-4">
        <h1 className="font-display text-3xl md:text-4xl text-[#ffabf3] tracking-widest text-glow-magenta mb-2">
          {isEs ? 'PROTOCOLO DE PRIVACIDAD' : 'PRIVACY PROTOCOL'}
        </h1>
        <p className="font-mono text-xs text-[#00fbfb]/70 tracking-widest uppercase">
          {isEs ? 'Última actualización: Julio 2026' : 'Last Updated: July 2026'}
        </p>
      </header>

      {isEs ? (
        <div className="flex flex-col gap-6 text-sm leading-relaxed text-[#dcbed4]/90 font-mono">
          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              1. RESUMEN EJECUTIVO
            </h2>
            <p>
              En <strong className="text-[#ffabf3]">VoxelRave Studios</strong>, nos tomamos en serio tu privacidad. Este juego, <strong>Musical Blocks (VoxelRave)</strong>, está diseñado para ser una experiencia ágil, divertida y con la menor recolección de datos posible. No requerimos la creación de cuentas de usuario, correos electrónicos ni contraseñas.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              2. INFORMACIÓN QUE RECOPILAMOS
            </h2>
            <p>
              Nuestro software opera bajo tres modalidades de procesamiento y recopilación de datos:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
              <li>
                <strong className="text-[#ffabf3]">Datos Temporales de Sesión (Multijugador):</strong> Al ingresar a una sala en línea, tu apodo (alias) y la configuración de tus cosméticos se transmiten temporalmente a nuestros servidores a través de WebSockets para poder sincronizar tu avatar y acciones en tiempo real con otros jugadores. Además, los mensajes enviados a través del chat en el lobby se transmiten en tiempo real a los demás jugadores de la sala. Esta información (incluyendo el historial de chat) se elimina automáticamente de la memoria del servidor al cerrarse la sala.
              </li>
              <li>
                <strong className="text-[#ffabf3]">Tabla de Clasificación Global (Leaderboard):</strong> Al finalizar una partida en el modo de un jugador, el juego transmite de manera permanente a nuestra base de datos tu alias, el puntaje total, las rondas sobrevividas, el modo de dificultad, la velocidad seleccionada y un identificador único aleatorio de jugador asignado localmente en tu dispositivo. Estos datos se recopilan con el único propósito de construir y mostrar el ranking mundial de puntuaciones del juego de forma pública.
              </li>
              <li>
                <strong className="text-[#ffabf3]">Datos de Red y Latencia:</strong> Para asegurar la sincronización del motor 3D y estabilidad de la partida, recolectamos temporalmente metadatos de red (ping y dirección IP de conexión al socket). No almacenamos estos datos de manera permanente ni los asociamos a tu identidad real.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              3. ALMACENAMIENTO LOCAL (LOCALSTORAGE)
            </h2>
            <p>
              Guardamos ciertos parámetros directamente en tu navegador utilizando almacenamiento web local (LocalStorage):
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
              <li>Tu apodo o alias preferido.</li>
              <li>Tus récords personales (High Scores) en el modo de un jugador.</li>
              <li>Tus configuraciones personalizadas (idioma, volumen de audio, modo de cámara y preferencias cosméticas).</li>
            </ul>
            <p>
              Esta información permanece bajo tu control en tu dispositivo y puedes borrarla en cualquier momento limpiando los datos de navegación de tu explorador.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              4. SERVICIOS DE TERCEROS Y COOKIES
            </h2>
            <p>
              No utilizamos cookies de seguimiento, ni SDKs de publicidad invasiva, ni herramientas de análisis conductual de terceros. El juego corre de forma independiente y autónoma. Sin embargo, nuestros proveedores de infraestructura (hosting y base de datos) pueden conservar registros técnicos (logs) de acceso de forma temporal (incluyendo direcciones IP) estrictamente por motivos de seguridad, prevención de ataques (DDoS) y estabilidad del servidor, sin fines de perfilamiento.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              5. SEGURIDAD DE LOS DATOS
            </h2>
            <p>
              Aunque la información transmitida es no sensible, utilizamos conexiones cifradas (HTTPS/WSS) para proteger los paquetes de datos durante la comunicación entre tu cliente de juego y nuestro servidor multijugador.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              6. PRIVACIDAD DE MENORES
            </h2>
            <p>
              Este juego no está dirigido a niños menores de 13 años. No recopilamos a sabiendas información personal de menores. Si descubrimos que se ha recopilado información de un menor sin el consentimiento verificable de sus padres, la eliminaremos inmediatamente de nuestros registros.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              7. CONTACTO Y SOPORTE
            </h2>
            <p>
              Si tienes preguntas sobre este protocolo de privacidad o deseas reportar alguna anomalía en el sistema, puedes contactar al desarrollador a través de su sitio web oficial:
              <br />
              <a
                href="https://josueortiz.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00fbfb] hover:text-[#ffabf3] underline transition-colors duration-200 mt-1 inline-block"
              >
                https://josueortiz.dev/
              </a>
            </p>
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-6 text-sm leading-relaxed text-[#dcbed4]/90 font-mono">
          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              1. EXECUTIVE SUMMARY
            </h2>
            <p>
              At <strong className="text-[#ffabf3]">VoxelRave Studios</strong>, we take your privacy seriously. This game, <strong>Musical Blocks (VoxelRave)</strong>, is designed to be an agile, fun experience with minimal data collection. We do not require account registration, emails, or passwords.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              2. INFORMATION WE COLLECT
            </h2>
            <p>
              Our software operates under three categories of data processing and collection:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
              <li>
                <strong className="text-[#ffabf3]">Temporary Session Data (Multiplayer):</strong> When joining an online lobby, your alias (nickname) and cosmetic settings are temporarily transmitted to our servers via WebSockets to synchronize your avatar and actions in real-time with other players. Additionally, messages sent through the lobby chat are transmitted in real-time to other players in the room. This information (including chat history) is automatically deleted from the server memory when the room is closed.
              </li>
              <li>
                <strong className="text-[#ffabf3]">Global Leaderboard:</strong> When finishing a single-player match, the game permanently transmits your alias, total score, rounds survived, difficulty mode, selected speed, and a locally assigned unique random player ID to our database. This data is collected solely to construct and publicly display the game&apos;s global high score rankings.
              </li>
              <li>
                <strong className="text-[#ffabf3]">Network Data and Latency:</strong> To ensure the synchronization of the 3D engine and match stability, we temporarily collect network metadata (ping and socket connection IP address). We do not permanently store this data or associate it with your real identity.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              3. LOCAL STORAGE (LOCALSTORAGE)
            </h2>
            <p>
              We save certain parameters directly in your browser using local web storage (LocalStorage):
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
              <li>Your preferred nickname or alias.</li>
              <li>Your personal records (High Scores) in single-player mode.</li>
              <li>Your custom settings (language, audio volume, camera mode, and cosmetic preferences).</li>
            </ul>
            <p>
              This information remains under your control on your device and you can delete it at any time by clearing your browser navigation data.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              4. THIRD-PARTY SERVICES AND COOKIES
            </h2>
            <p>
              We do not use tracking cookies, invasive advertising SDKs, or third-party behavioral analytics tools. The game runs independently and autonomously. However, our infrastructure providers (hosting and database) may temporarily keep technical access logs (including IP addresses) strictly for security reasons, DDoS prevention, and server stability, without profiling purposes.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              5. DATA SECURITY
            </h2>
            <p>
              Although the transmitted information is non-sensitive, we use encrypted connections (HTTPS/WSS) to protect data packets during communication between your game client and our multiplayer server.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              6. CHILDREN'S PRIVACY
            </h2>
            <p>
              This game is not directed at children under the age of 13. We do not knowingly collect personal information from children. If we discover that information from a child has been collected without verifiable parental consent, we will delete it immediately from our records.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              7. CONTACT AND SUPPORT
            </h2>
            <p>
              If you have questions about this privacy protocol or wish to report any system anomalies, you can contact the developer through their official website:
              <br />
              <a
                href="https://josueortiz.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00fbfb] hover:text-[#ffabf3] underline transition-colors duration-200 mt-1 inline-block"
              >
                https://josueortiz.dev/
              </a>
            </p>
          </section>
        </div>
      )}
    </article>
  );
}
