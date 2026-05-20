'use client';

import { useEffect, useRef } from 'react';
import { Howl, Howler } from 'howler';
import { useGameStore } from '@/src/stores/gameStore';
import { Player } from '@/src/shared/types';

// ---------------------------------------------------------------------------
//  Audio Assets Definition
// ---------------------------------------------------------------------------
export const MUSIC_TRACKS = {
  lobby: new Howl({ src: ['/audio/music/lobby/Between_Save_Points.mp3'], loop: true, volume: 0.4 }),
  dance: [
    new Howl({ src: ['/audio/music/Apex_Ascent.mp3'], loop: true, volume: 0.45 }),
    new Howl({ src: ['/audio/music/Fuego_en_los_pies.mp3'], loop: true, volume: 0.45 }),
    new Howl({ src: ['/audio/music/The_Final_Jump.mp3'], loop: true, volume: 0.45 }),
  ],
};

const SFX = {
  join: new Howl({ src: ['/audio/Effects/Jugador se une.mp3'], volume: 0.6 }),
  countdown: new Howl({ src: ['/audio/Effects/Cuenta Regresiva.mp3'], volume: 0.6 }),
  announce: new Howl({ src: ['/audio/Effects/Aviso de Color.mp3'], volume: 0.8 }),
  fall: new Howl({ src: ['/audio/Effects/Caída de Bloques.mp3'], volume: 0.7 }),
  death: new Howl({ src: ['/audio/Effects/Muerte de Jugador.mp3'], volume: 0.9 }),
  win: new Howl({ src: ['/audio/Effects/Victoria Final.mp3'], volume: 0.8 }),
};

// ---------------------------------------------------------------------------
//  Global Audio Hook
// ---------------------------------------------------------------------------
const EMPTY_PLAYERS: Player[] = [];

export function useGameAudio() {
  const gameState = useGameStore((s) => s.gameState);
  const screen = useGameStore((s) => s.screen);
  const isMuted = useGameStore((s) => s.isMuted);
  const volume = useGameStore((s) => s.volume);

  const phase = gameState?.phase;
  const timeLeft = gameState?.timeLeft ?? 0;
  const players = gameState?.players ?? EMPTY_PLAYERS;
  const roomId = useGameStore((s) => s.room?.id) || 'DEFAULT';

  const aliveCount = players.filter(p => p.isAlive).length;
  const gameSpeed = useGameStore((s) => s.room?.settings?.gameSpeed) || 'NORMAL';

  const prevPhase = useRef<string | undefined>(undefined);
  const prevTimeLeft = useRef<number>(0);
  const prevPlayerCount = useRef<number>(0);
  const prevAliveCount = useRef<number>(0);
  const activeDanceTrack = useRef<Howl | null>(null);

  // 1. Sync global volume and mute
  useEffect(() => {
    Howler.mute(isMuted);
    Howler.volume(volume);
  }, [isMuted, volume]);

  // 2. Main Audio Logic Effect
  useEffect(() => {
    if (screen === 'home') {
      MUSIC_TRACKS.lobby.stop();
      activeDanceTrack.current?.stop();
      activeDanceTrack.current = null;
      return;
    }

    // ---- LOBBY MUSIC ----
    if (screen === 'lobby') {
      if (!MUSIC_TRACKS.lobby.playing()) {
        activeDanceTrack.current?.stop();
        activeDanceTrack.current = null;
        MUSIC_TRACKS.lobby.play();
        MUSIC_TRACKS.lobby.fade(0, 0.4, 1000);
      }

      // SFX: Player Join
      if (players.length > prevPlayerCount.current && prevPlayerCount.current > 0) {
        SFX.join.play();
      }
    }

    // ---- GAME AUDIO ----
    if (screen === 'game' || screen === 'dead' || screen === 'winner') {

      // Phase Transitions
      if (phase !== prevPhase.current) {
        if (phase === 'DANCING') {
          // Resume or Start Music at FULL VOLUME
          if (!activeDanceTrack.current) {
            MUSIC_TRACKS.lobby.fade(0.4, 0, 500);
            setTimeout(() => MUSIC_TRACKS.lobby.stop(), 500);

            // Track selection based on Room ID and Game Speed
            let track: Howl;
            if (gameSpeed === 'TURBO') {
              // Force intense tracks (index 1: Fuego_en_los_pies, index 2: The_Final_Jump)
              const trackIndex = (roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 2) + 1;
              track = MUSIC_TRACKS.dance[trackIndex];
            } else {
              const trackIndex = roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % MUSIC_TRACKS.dance.length;
              track = MUSIC_TRACKS.dance[trackIndex];
            }
            
            activeDanceTrack.current = track;
            track.play();
            track.volume(0.45);
          } else {
            activeDanceTrack.current.play();
            activeDanceTrack.current.fade(activeDanceTrack.current.volume(), 0.45, 500);
          }
        }
        else if (phase === 'ANNOUNCING') {
          SFX.announce.play();
          // Music continues normally here (La fiesta sigue!)
        }
        else if (phase === 'ELIMINATING') {
          // PAUSE music immediately when blocks fall
          if (activeDanceTrack.current?.playing()) {
            activeDanceTrack.current.pause();
          }
          SFX.fall.play();
          SFX.countdown.stop();
        }
        else if (phase === 'GAME_OVER') {
          activeDanceTrack.current?.stop();
          activeDanceTrack.current = null;
          if (screen === 'winner') SFX.win.play();
        }
      }

      // Handle Volume during Countdown (Last N seconds of ANNOUNCING)
      if (phase === 'ANNOUNCING') {
        const countdownThreshold = gameSpeed === 'TURBO' ? 2 : gameSpeed === 'CHILL' ? 5 : 4;
        
        if (timeLeft <= countdownThreshold && timeLeft > 0) {
          // Fade music down to hear beeps, but keep it audible (0.15)
          if (activeDanceTrack.current?.playing() && activeDanceTrack.current.volume() > 0.16) {
            activeDanceTrack.current.fade(0.45, 0.30, 500);
          }
          if (timeLeft !== prevTimeLeft.current) {
            SFX.countdown.play();
          }
        } else if (timeLeft > countdownThreshold) {
          // Ensure music is at full volume if it was faded
          if (activeDanceTrack.current?.playing() && activeDanceTrack.current.volume() < 0.4) {
            activeDanceTrack.current.fade(activeDanceTrack.current.volume(), 0.45, 500);
          }
        }
      }

      // SFX: Player Death
      if (aliveCount < prevAliveCount.current && prevAliveCount.current > 0) {
        SFX.death.play();
      }
      prevAliveCount.current = aliveCount;
    }

    // Update refs for next render
    prevPhase.current = phase;
    prevTimeLeft.current = timeLeft;
    prevPlayerCount.current = players.length;

  }, [screen, phase, timeLeft, players.length, aliveCount, roomId, gameSpeed]);

  // 3. Handle Visibility Change (Background/Foreground)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Force mute when hidden to stop music on mobile background
        Howler.mute(true);
      } else {
        // Restore mute state only if the user hasn't manually muted
        Howler.mute(isMuted);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isMuted]);
}
