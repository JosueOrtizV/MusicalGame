'use client';

import React from 'react';
import { useTranslation } from '@/src/hooks/useTranslation';

export function TermsClient() {
  const { lang } = useTranslation();
  const isEs = lang === 'es';

  return (
    <article className="prose prose-invert max-w-none flex flex-col gap-6">
      <header className="border-b border-[#00fbfb]/20 pb-4">
        <h1 className="font-display text-3xl md:text-4xl text-[#ffabf3] tracking-widest text-glow-magenta mb-2">
          {isEs ? 'TÉRMINOS DE SERVICIO' : 'TERMS OF SERVICE'}
        </h1>
        <p className="font-mono text-xs text-[#00fbfb]/70 tracking-widest uppercase">
          {isEs ? 'Última actualización: Julio 2026' : 'Last Updated: July 2026'}
        </p>
      </header>

      {isEs ? (
        <div className="flex flex-col gap-6 text-sm leading-relaxed text-[#dcbed4]/90 font-mono">
          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              1. ACEPTACIÓN DE LOS TÉRMINOS
            </h2>
            <p>
              Al acceder o jugar a <strong>Musical Blocks (VoxelRave)</strong>, aceptas cumplir y estar sujeto a estos términos y condiciones. Si no estás de acuerdo con alguna parte de estas directrices, debes abstenerte de hacer uso del juego y sus servidores asociados.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              2. LICENCIA DE USO Y REQUISITOS
            </h2>
            <p>
              <strong className="text-[#ffabf3]">VoxelRave Studios</strong> te otorga una licencia personal, no exclusiva, intransferible y limitada para acceder y disfrutar del cliente de juego a través de un navegador web compatible. El acceso al juego es gratuito. No está permitido:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
              <li>Realizar ingeniería inversa, descompilar o extraer código del motor 3D y cliente sin autorización escrita.</li>
              <li>Utilizar bots, scripts automatizados o hacks para alterar la física de los bloques o ganar ventajas injustas en el modo multijugador.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              3. CÓDIGO DE CONDUCTA EN MULTIJUGADOR
            </h2>
            <p>
              El modo multijugador te permite interactuar con otros entusiastas a través de salas públicas y privadas. Para mantener un ambiente saludable, te comprometes a:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
              <li>
                <strong className="text-[#ffabf3]">Alias apropiados:</strong> Elegir nombres de usuario respetuosos, sin contenido vulgar, ofensivo, discriminatorio o difamatorio.
              </li>
              <li>
                <strong className="text-[#ffabf3]">Respeto en el chat:</strong> Utilizar el chat de la sala con cordialidad. Queda estrictamente prohibido el spam, el acoso y el comportamiento tóxico.
              </li>
              <li>
                <strong className="text-[#ffabf3]">Moderación del anfitrión:</strong> El creador de una sala tiene plena facultad para expulsar (kick) a cualquier jugador que interrumpa el flujo del lobby o infrinja estas reglas.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              4. DISPONIBILIDAD DEL SERVICIO
            </h2>
            <p>
              Los servicios multijugador se proporcionan "tal cual" y "según disponibilidad". <strong className="text-[#ffabf3]">VoxelRave Studios</strong> no garantiza que los servidores estén en línea las 24 horas del día. Nos reservamos el derecho de reiniciar, suspender temporalmente o suspender indefinidamente los servidores por mantenimiento, actualizaciones o razones técnicas sin previo aviso.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              5. PROPIEDAD INTELECTUAL
            </h2>
            <p>
              Todos los elementos visuales, auditivos, assets 3D, código de cliente y servidor, marcas y logos del juego son propiedad exclusiva de <strong className="text-[#ffabf3]">VoxelRave Studios</strong>. No se transfiere ningún derecho de propiedad o de autor al usuario mediante el juego.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              6. LIMITACIÓN DE RESPONSABILIDAD
            </h2>
            <p>
              En la máxima medida permitida por la ley aplicable, el desarrollador no será responsable por ningún daño directo, indirecto, incidental o consecuente derivado del uso o la imposibilidad de uso del software (por ejemplo, desconexiones durante una partida con alta puntuación o pérdida de datos en LocalStorage).
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              7. SOPORTE Y CONTACTO
            </h2>
            <p>
              Ante cualquier duda, sugerencia o reclamación respecto a los presentes términos de servicio, puedes ingresar a nuestro portal web oficial:
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
              1. ACCEPTANCE OF TERMS
            </h2>
            <p>
              By accessing or playing <strong>Musical Blocks (VoxelRave)</strong>, you agree to comply with and be bound by these terms and conditions. If you do not agree with any part of these guidelines, you must refrain from using the game and its associated servers.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              2. LICENSE TO USE AND RESTRICTIONS
            </h2>
            <p>
              <strong className="text-[#ffabf3]">VoxelRave Studios</strong> grants you a personal, non-exclusive, non-transferable, and limited license to access and enjoy the game client through a compatible web browser. Access to the game is free. The following is prohibited:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
              <li>Reverse engineering, decompiling, or extracting code from the 3D engine and client without written authorization.</li>
              <li>Using bots, automated scripts, or hacks to alter block physics or gain unfair advantages in multiplayer mode.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              3. MULTIPLAYER CODE OF CONDUCT
            </h2>
            <p>
              Multiplayer mode allows you to interact with other players in public and private rooms. To maintain a healthy environment, you agree to:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
              <li>
                <strong className="text-[#ffabf3]">Appropriate nicknames:</strong> Choose respectful nicknames without vulgar, offensive, discriminatory, or defamatory content.
              </li>
              <li>
                <strong className="text-[#ffabf3]">Respect in chat:</strong> Use the lobby chat cordially. Spam, harassment, and toxic behavior are strictly prohibited.
              </li>
              <li>
                <strong className="text-[#ffabf3]">Host moderation:</strong> The room host has the full right to kick any player who disrupts the lobby flow or violates these rules.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              4. SERVICE AVAILABILITY
            </h2>
            <p>
              Multiplayer services are provided "as is" and "as available". <strong className="text-[#ffabf3]">VoxelRave Studios</strong> does not guarantee that the servers will be online 24/7. We reserve the right to restart, temporarily suspend, or indefinitely suspend the servers for maintenance, updates, or technical reasons without prior notice.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              5. INTELLECTUAL PROPERTY
            </h2>
            <p>
              All visual and auditory elements, 3D assets, client and server code, trademarks, and logos of the game are the exclusive property of <strong className="text-[#ffabf3]">VoxelRave Studios</strong>. No ownership or copyright is transferred to the user by playing the game.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              6. LIMITATION OF LIABILITY
            </h2>
            <p>
              To the maximum extent permitted by applicable law, the developer shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use or inability to use the software (e.g., disconnections during a high-score match or loss of data in LocalStorage).
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[#00fbfb] text-base font-bold tracking-wider uppercase border-b border-[#00fbfb]/10 pb-1">
              7. SUPPORT AND CONTACT
            </h2>
            <p>
              For any questions, suggestions, or claims regarding these terms of service, you can visit our official web portal:
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
