'use client';

import { useEffect, useRef } from 'react';
import { Howl, Howler } from 'howler';
import { useGameStore } from '@/src/stores/gameStore';
import { Player } from '@/src/shared/types';

// ---------------------------------------------------------------------------
//  Audio Assets Definition — Lobby, Game (Dance), and Victory (Winner) tracks
// ---------------------------------------------------------------------------
export const LOBBY_SONGS = [
  new Howl({ src: ['/audio/music/lobby/Between_Save_Points.mp3'], loop: true, volume: 0.4, html5: true }),
  new Howl({ src: ['/audio/music/lobby/Lobby2.m4a'], loop: true, volume: 0.4, html5: true }),
  new Howl({ src: ['/audio/music/lobby/generated_task.m4a'], loop: true, volume: 0.4, html5: true }),
];

export const DANCE_SONGS = [
  new Howl({ src: ['/audio/music/Apex_Ascent.mp3'], loop: false, volume: 0.45, html5: true }),
  new Howl({ src: ['/audio/music/Fuego_en_los_pies.mp3'], loop: false, volume: 0.45, html5: true }),
  new Howl({ src: ['/audio/music/The_Final_Jump.mp3'], loop: false, volume: 0.45, html5: true }),
  new Howl({ src: ['/audio/music/Blackout Pulse.mp3'], loop: false, volume: 0.45, html5: true }),
  new Howl({ src: ['/audio/music/Cyber Dancer.m4a'], loop: false, volume: 0.45, html5: true }),
  new Howl({ src: ['/audio/music/Digital Ashes.m4a'], loop: false, volume: 0.45, html5: true }),
  new Howl({ src: ['/audio/music/Overclocked Relay.m4a'], loop: false, volume: 0.45, html5: true }),
  new Howl({ src: ['/audio/music/Overclocked.mp3'], loop: false, volume: 0.45, html5: true }),
  new Howl({ src: ['/audio/music/Power on Right.m4a'], loop: false, volume: 0.45, html5: true }),
  new Howl({ src: ['/audio/music/Voxel Drift.m4a'], loop: false, volume: 0.45, html5: true }),
];

export const WINNER_SONGS = [
  new Howl({ src: ['/audio/music/winner/Skyward_Ascent.mp3'], loop: true, volume: 0.35, html5: true }),
  new Howl({ src: ['/audio/music/winner/Title_Screen_Winner.mp3'], loop: true, volume: 0.35, html5: true }),
  new Howl({ src: ['/audio/music/winner/Victory_Bound.mp3'], loop: true, volume: 0.35, html5: true }),
];

const SFX = {
  join: new Howl({ src: ['/audio/Effects/Jugador se une.mp3'], volume: 0.6 }),
  countdown: new Howl({ src: ['/audio/Effects/Cuenta Regresiva.mp3'], volume: 0.6 }),
  announce: new Howl({ src: ['/audio/Effects/Aviso de Color.mp3'], volume: 0.8 }),
  fall: new Howl({ src: ['/audio/Effects/Caída de Bloques.mp3'], volume: 0.7 }),
  death: new Howl({ src: ['/audio/Effects/Muerte de Jugador.mp3'], volume: 0.9 }),
  win: new Howl({ src: ['/audio/Effects/Victoria Final.mp3'], volume: 0.8 }),
};

// Helpers to prevent track overlaps
const stopWinnerSongs = () => {
  WINNER_SONGS.forEach(t => t.stop());
};

const stopAllLobbySongsExcept = (exceptTrack?: Howl) => {
  LOBBY_SONGS.forEach(t => {
    if (t !== exceptTrack) t.stop();
  });
};

const stopAllDanceSongs = () => {
  DANCE_SONGS.forEach(t => t.stop());
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
  const room = useGameStore((s) => s.room);

  const phase = gameState?.phase;
  const timeLeft = gameState?.timeLeft ?? 0;
  const players = gameState?.players ?? EMPTY_PLAYERS;

  const aliveCount = players.filter(p => p.isAlive).length;

  const prevPhase = useRef<string | undefined>(undefined);
  const prevTimeLeft = useRef<number>(0);
  const prevPlayerCount = useRef<number>(0);
  const prevAliveCount = useRef<number>(0);
  
  const activeDanceTrack = useRef<Howl | null>(null);
  const playlistIndexRef = useRef<number>(0);

  // Sync global volume and mute
  useEffect(() => {
    Howler.mute(isMuted);
    Howler.volume(volume);
  }, [isMuted, volume]);

  // Dynamic recursive playlist advancement function
  const bindOnEnd = (track: Howl) => {
    track.off('end');
    track.on('end', () => {
      console.log(`[Audio] Song ended. Loading next track in room playlist.`);
      track.stop();
      
      playlistIndexRef.current++;
      const playlist = room?.gameSongIndices || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const nextIdx = playlist[playlistIndexRef.current % playlist.length];
      const nextTrack = DANCE_SONGS[nextIdx] || DANCE_SONGS[0];
      
      activeDanceTrack.current = nextTrack;
      bindOnEnd(nextTrack);
      
      nextTrack.play();
      
      const currentPhase = useGameStore.getState().gameState?.phase;
      const vol = currentPhase === 'ANNOUNCING' ? 0.30 : 0.45;
      nextTrack.volume(vol);
    });
  };

  // Main Audio Logic Effect
  useEffect(() => {
    if (screen === 'home') {
      stopAllLobbySongsExcept();
      activeDanceTrack.current?.stop();
      activeDanceTrack.current = null;
      stopWinnerSongs();
      stopAllDanceSongs();
      return;
    }

    // ---- LOBBY MUSIC (authoritative sync) ----
    if (screen === 'lobby') {
      const lobbyIdx = room?.lobbySongIndex ?? 0;
      const activeLobbyTrack = LOBBY_SONGS[lobbyIdx] || LOBBY_SONGS[0];

      activeDanceTrack.current?.stop();
      activeDanceTrack.current = null;
      stopWinnerSongs();

      if (!activeLobbyTrack.playing()) {
        stopAllLobbySongsExcept(activeLobbyTrack);
        activeLobbyTrack.play();
        activeLobbyTrack.fade(0, 0.4, 1000);
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
        if (phase === 'STARTING' || phase === 'DANCING') {
          // Stop Lobby Music
          stopAllLobbySongsExcept();
          stopWinnerSongs();

          if (!activeDanceTrack.current) {
            playlistIndexRef.current = 0;
            const playlist = room?.gameSongIndices || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            const activeIdx = playlist[0];
            const track = DANCE_SONGS[activeIdx] || DANCE_SONGS[0];

            activeDanceTrack.current = track;
            bindOnEnd(track);
            track.play();
            track.volume(0.45);
          } else if (!activeDanceTrack.current.playing()) {
            // Resume the track from pause (La fiesta sigue!)
            activeDanceTrack.current.play();
            activeDanceTrack.current.fade(activeDanceTrack.current.volume(), 0.45, 500);
          }
        }
        else if (phase === 'ANNOUNCING') {
          SFX.announce.play();
        }
        else if (phase === 'ELIMINATING') {
          // Pause game music immediately during block falling phase
          if (activeDanceTrack.current?.playing()) {
            activeDanceTrack.current.pause();
          }
          SFX.fall.play();
          SFX.countdown.stop();
        }
        else if (phase === 'GAME_OVER') {
          activeDanceTrack.current?.stop();
          activeDanceTrack.current = null;

          if (screen === 'winner' || screen === 'dead') {
            stopWinnerSongs();
            stopAllDanceSongs();
            
            const winIdx = room?.victorySongIndex ?? 0;
            const winTrack = WINNER_SONGS[winIdx] || WINNER_SONGS[0];

            SFX.win.play();

            // Delay victory music slightly so the epic SFX doesn't get obscured
            setTimeout(() => {
              const currentPhase = useGameStore.getState().gameState?.phase;
              if (currentPhase === 'GAME_OVER') {
                winTrack.play();
                winTrack.fade(0, 0.35, 1500); // Fades in smoothly at low volume
              }
            }, 1000);
          }
        }
      }

      // Handle Volume during Countdown (Last 3 seconds of ANNOUNCING)
      if (phase === 'ANNOUNCING') {
        const countdownThreshold = 3;
        
        if (timeLeft <= countdownThreshold && timeLeft > 0) {
          // Fade music down to hear countdown beeps clearly
          if (activeDanceTrack.current?.playing() && activeDanceTrack.current.volume() > 0.16) {
            activeDanceTrack.current.fade(0.45, 0.30, 500);
          }
          if (timeLeft !== prevTimeLeft.current) {
            SFX.countdown.play();
          }
        } else if (timeLeft > countdownThreshold) {
          // Restore full volume
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

  }, [screen, phase, timeLeft, players.length, aliveCount, room]);

  // Handle Visibility Change (Background/Foreground)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        Howler.mute(true);
      } else {
        Howler.mute(isMuted);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isMuted]);
}
