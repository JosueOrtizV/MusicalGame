export const en = {
  // Common
  loading: 'Loading...',
  back: '← Back',
  cancel: 'Cancel',

  // Settings
  settings: 'Settings',
  language: 'Language',
  volume: 'Volume',
  mute: 'Mute',

  // Colors
  RED: 'Red',
  BLUE: 'Blue',
  GREEN: 'Green',
  YELLOW: 'Yellow',
  MAGENTA: 'Magenta',
  ORANGE: 'Orange',
  PURPLE: 'Purple',
  CYAN: 'Cyan',

  // Lobby
  gameTitle: 'Musical Blocks',
  gameSubtitle: 'Party Game',
  yourName: 'Your Name',
  namePlaceholder: 'Enter your alias...',
  quickJoin: '⚡ Quick Join',
  joinPrivate: '🔑 Join Private Room',
  createPrivate: '🔒 Create Private Room',
  browseRooms: 'Browse public rooms ↓',
  activeRooms: 'Active Rooms',
  noPublicRooms: 'No public rooms — create one!',
  join: 'Join',
  joining: '⏳ Joining...',
  creating: '⏳ Creating...',
  
  // Join Private Step
  joinRoomTitle: 'Join Room',
  joinRoomSub: 'Enter the private room code',
  roomCode: 'Room Code',
  codePlaceholder: 'Ex: BLUE',
  codeHelp: 'Ask the host for the 4-letter code',
  connecting: '⏳ Connecting...',

  // Errors
  errGeneric: 'Something went wrong.',
  errFetchRooms: 'Could not fetch room list.',
  errNameLength: 'Name must be 2–16 characters.',
  errNameFirst: 'Enter your name first.',
  errCodeLength: 'Room code must be 4 characters.',
  errSessionLost: 'Session lost. You have been disconnected.',

  // Room Lobby
  privateRoom: '🔑 Room #{id}',
  publicRoom: '🌐 Public Room',
  shareCodeHint: 'Share the code with your friends',
  waitingPlayersHint: 'Waiting for other players...',
  hostBadge: '👑 Host',
  youBadge: '(You)',
  playerJoined: '{name} joined the room',
  ready: '✅ Ready',
  notReady: '⌛ Waiting',
  readyBtn: '✅ Ready!',
  notReadyBtn: '⌛ Not Ready',
  viewingResults: 'Viewing results...',
  waitingForPlayer: 'Waiting for player...',
  startGame: '🎮 Start Game',
  leaveRoom: '← Leave Room',
  kickPlayer: 'Kick Player',
  needMorePlayers: 'At least 2 players needed',
  everyoneReady: 'Everyone ready! Press start.',
  hostWillStart: 'The host will start the game',
  suddenDeath: 'SUDDEN DEATH!',

  // Game HUD
  phaseDancing: '🎵 Dance!',
  phaseAnnouncing: '🎯 Find your color!',
  phaseEliminating: '💥 Eliminating...',
  phaseRoundEnd: '✅ Round complete',
  alivePlayers: '🎮 {alive} / {total} alive',
  saveYourself: 'Save yourself! Stand on:',
  roundNumber: '⚡ Round {round}',
  survive: 'Survive!',

  // End Screens
  youFell: 'You fell!',
  stillDancing: '{count} players still dancing...',
  lastOneWins: 'Last one standing wins!',
  spectating: '👁 Spectating...',
  victory: 'VICTORY!',
  youWon: 'You are the last one dancing!',
  gameOver: 'GAME OVER',
  winnerIs: '🏆 {name} won!',
  nobodyWon: 'Nobody survived!',
  autoReturnIn: 'Auto-returning to lobby in {{seconds}}s...',
  backToLobby: 'Back to Lobby',
};

export type Translations = typeof en;
