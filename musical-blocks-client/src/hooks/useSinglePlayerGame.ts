'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '@/src/stores/gameStore';
import { GameState, GamePhase, BlockColor, GameBlock, Player, Direction, GameSpeed, GridPosition, RoomSettings } from '@/src/shared/types';
import { ClientGridManager } from '../lib/ClientGridManager';
import { ClientPlayerController } from '../lib/ClientPlayerController';
import { ClientGameLoop } from '../lib/ClientGameLoop';
import { submitScore } from '../lib/supabase/leaderboard';

export function useSinglePlayerGame() {
  const gridManager = useRef(new ClientGridManager());
  const playerController = useRef(new ClientPlayerController());
  const gameLoop = useRef<ClientGameLoop | null>(null);
  
  const [currentScore, setCurrentScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const updateGameState = useCallback((
    phase: GamePhase = gameLoop.current?.getPhase() || 'LOBBY',
    timeLeft = gameLoop.current ? gameLoop.current.getTimeLeft() : 0,
    blocks: GameBlock[][] = gridManager.current.getSnapshot(),
    playerPos = playerController.current.getPosition(),
    lives = gameLoop.current ? gameLoop.current.getLives() : 3,
    isAlive = gameLoop.current ? gameLoop.current.getIsAlive() : true
  ) => {
    const state = useGameStore.getState();
    const cosmetics = state.localCosmetics;
    const playerColor = cosmetics.primaryColor || '#39FF14';

    const localPlayer: Player = {
      id: 'player-local',
      name: state.localPlayerName || 'Josué',
      position: playerPos,
      isAlive,
      lives,
      isReady: true,
      isHost: true,
      color: playerColor,
      hasReturnedToLobby: false,
      cosmetics
    };

    const newGameState: GameState = {
      phase,
      round: gameLoop.current ? gameLoop.current.getRound() : 1,
      timeLeft,
      isBlackout: gameLoop.current ? gameLoop.current.getIsBlackout() : false,
      winnerColor: gameLoop.current ? gameLoop.current.getPendingWinner() : null,
      blocks,
      players: [localPlayer],
      winnerId: null
    };

    state.setGameState(newGameState);
    const scoreVal = gameLoop.current?.getScore() || 0;
    state.setSpLastScore(scoreVal);
    setCurrentScore(scoreVal);
    setCurrentRound(newGameState.round);
  }, []);

  const handleGameOver = useCallback(async (finalScore: number, rounds: number) => {
    setIsGameOver(true);
    const state = useGameStore.getState();
    state.setSpLastScore(finalScore);
    state.setSpLastRounds(rounds);
    
    // Update local highscore
    if (finalScore > state.spHighScore) {
      state.setSpHighScore(finalScore);
    }

    // Submit to Supabase leaderboard (fire and forget)
    const spPlayerId = state.spPlayerId || 'anonymous';
    const difficultyLevel = gridManager.current.getColorDistribution();
    const colorsCount = Object.values(difficultyLevel).reduce((a, b) => a + (b > 0 ? 1 : 0), 0);
    
    let difficultyName = 'normal';
    if (colorsCount <= 4) difficultyName = 'easy';
    else if (colorsCount <= 6) difficultyName = 'normal';
    else if (colorsCount <= 8) difficultyName = 'hard';
    else difficultyName = 'extreme';

    const speed = gameLoop.current ? gameLoop.current.getSpeed() : 'NORMAL';

    submitScore({
      player_id: spPlayerId,
      name: state.localPlayerName || 'Player Solo',
      score: finalScore,
      rounds: rounds,
      difficulty: difficultyName,
      speed: speed
    });

    state.setScreen('winner');
  }, []);

  const startNewGame = useCallback((settings: RoomSettings) => {
    setIsGameOver(false);
    const state = useGameStore.getState();
    state.initSpPlayerId();
    state.setGameMode('singleplayer');
    
    // Clear connection and room status so we are fully offline
    useGameStore.setState({
      localPlayerId: 'player-local',
      room: null,
      screen: 'game'
    });

    if (gameLoop.current) {
      gameLoop.current.stop();
    }

    gridManager.current = new ClientGridManager();
    playerController.current = new ClientPlayerController();

    const callbacks = {
      onRoundStart: (round: number, duration: number, blocks: GameBlock[][], playerPos: GridPosition) => {
        updateGameState('DANCING', duration, blocks, playerPos);
      },
      onAnnounce: (_winnerColor: BlockColor) => {
        updateGameState('ANNOUNCING');
      },
      onEliminate: (eliminated: Array<{ row: number; col: number }>, lives: number, isAlive: boolean) => {
        updateGameState('ELIMINATING', 0, gridManager.current.getSnapshot(), playerController.current.getPosition(), lives, isAlive);
      },
      onGameOver: (finalScore: number, rounds: number) => {
        handleGameOver(finalScore, rounds);
      },
      onTimeTick: (timeLeft: number) => {
        const phase = gameLoop.current?.getPhase() || 'LOBBY';
        updateGameState(phase, timeLeft);
      },
      onStateUpdate: (phase: GamePhase, timeLeft: number, blocks: GameBlock[][], playerPos: GridPosition, lives: number, isAlive: boolean) => {
        updateGameState(phase, timeLeft, blocks, playerPos, lives, isAlive);
      }
    };

    gameLoop.current = new ClientGameLoop(gridManager.current, playerController.current, callbacks);
    gameLoop.current.start(settings);
  }, [updateGameState, handleGameOver]);

  const stopGame = useCallback(() => {
    if (gameLoop.current) {
      gameLoop.current.stop();
    }
  }, []);

  // Listen for start and stop events
  useEffect(() => {
    const handleStart = (e: Event) => {
      const customEvent = e as CustomEvent<{
        difficulty?: number;
        speed?: GameSpeed;
        maxLives?: number;
        settings?: RoomSettings;
      }>;
      
      let settings: RoomSettings;
      if (customEvent.detail.settings) {
        settings = customEvent.detail.settings;
      } else {
        const difficulty = customEvent.detail.difficulty ?? 6;
        const speed = customEvent.detail.speed ?? 'NORMAL';
        const maxLives = customEvent.detail.maxLives ?? 3;
        settings = {
          maxColors: difficulty,
          gameSpeed: speed,
          maxLives: maxLives,
          isBlindMode: false,
          suddenDeathMode: 'NORMAL',
          enableCollisions: false
        };
      }
      
      startNewGame(settings);
    };

    const handleStop = () => {
      stopGame();
    };

    window.addEventListener('sp:start', handleStart);
    window.addEventListener('sp:stop', handleStop);
    return () => {
      window.removeEventListener('sp:start', handleStart);
      window.removeEventListener('sp:stop', handleStop);
    };
  }, [startNewGame, stopGame]);

  // Listen for screen changes to stop the game if we return to lobby
  useEffect(() => {
    return useGameStore.subscribe((state) => {
      if (state.screen === 'home') {
        stopGame();
      }
    });
  }, [stopGame]);

  // Listen for local player moves
  useEffect(() => {
    const handleMove = (e: Event) => {
      const customEvent = e as CustomEvent<{ direction: Direction }>;
      const { direction } = customEvent.detail;
      
      if (!gameLoop.current || gameLoop.current.getPhase() === 'LOBBY') return;
      
      const newPos = playerController.current.validateAndMove(direction, gridManager.current);
      if (newPos) {
        updateGameState();
      }
    };

    window.addEventListener('sp:move', handleMove);
    return () => window.removeEventListener('sp:move', handleMove);
  }, [updateGameState]);

  return {
    startNewGame,
    stopGame,
    currentScore,
    currentRound,
    isGameOver
  };
}