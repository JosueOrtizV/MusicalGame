import { Translations } from './en';

export const es: Translations = {
  // Common
  loading: 'Cargando...',
  back: '← Volver',
  cancel: 'Cancelar',

  // Settings
  settings: 'Ajustes',
  language: 'Idioma',
  volume: 'Volumen',
  mute: 'Silencio',

  // Colors
  RED: 'Rojo',
  BLUE: 'Azul',
  GREEN: 'Verde',
  YELLOW: 'Amarillo',
  MAGENTA: 'Magenta',
  ORANGE: 'Naranja',
  PURPLE: 'Púrpura',
  CYAN: 'Cian',

  // Lobby
  gameTitle: 'Musical Blocks',
  gameSubtitle: '¡A bailar!',
  yourName: 'Tu Apodo',
  namePlaceholder: 'Escribe tu nombre...',
  quickJoin: '⚡ Partida Rápida',
  joinPrivate: '🔑 Unirse a una Mesa',
  createPrivate: '🔒 Crear Mesa Privada',
  browseRooms: 'Explorar salas públicas ↓',
  activeRooms: 'Salas Activas',
  noPublicRooms: 'No hay salas públicas — ¡crea una!',
  join: 'Unirse',
  joining: '⏳ Entrando...',
  creating: '⏳ Creando...',
  
  // Join Private Step
  joinRoomTitle: 'Unirse a Mesa',
  joinRoomSub: 'Ingresa los datos de la mesa privada',
  roomCode: 'Código de Mesa',
  codePlaceholder: 'Ej: AZUL',
  codeHelp: 'Pide el código de 4 letras al anfitrión',
  connecting: '⏳ Conectando...',

  // Errors
  errGeneric: 'Algo salió mal.',
  errFetchRooms: 'No se pudo obtener la lista de salas.',
  errNameLength: 'El nombre debe tener entre 2 y 16 caracteres.',
  errNameFirst: 'Escribe tu nombre primero.',
  errCodeLength: 'El código de mesa debe ser de 4 letras.',
  errSessionLost: 'Sesión perdida. Has sido desconectado.',

  // Room Lobby
  privateRoom: '🔑 Mesa #{id}',
  publicRoom: '🌐 Sala Pública',
  shareCodeHint: 'Comparte el código con tus amigos',
  waitingPlayersHint: 'Esperando a otros jugadores...',
  hostBadge: '👑 Anfitrión',
  youBadge: '(Tú)',
  playerJoined: '{name} se ha unido',
  ready: '✅ Listo',
  notReady: '⌛ Esperando',
  readyBtn: '✅ ¡Estoy listo!',
  notReadyBtn: '⌛ No estoy listo',
  viewingResults: 'Viendo resultados...',
  waitingForPlayer: 'Esperando jugador...',
  startGame: '🎮 Iniciar Juego',
  leaveRoom: '← Salir de la Mesa',
  kickPlayer: 'Expulsar Jugador',
  needMorePlayers: 'Se necesitan al menos 2 jugadores',
  everyoneReady: '¡Todos listos! Pulsa iniciar.',
  hostWillStart: 'El anfitrión iniciará la partida',
  suddenDeath: '¡MUERTE SÚBITA!',

  // Game HUD
  phaseDancing: '🎵 ¡A bailar!',
  phaseAnnouncing: '🎯 ¡Busca tu color!',
  phaseEliminating: '💥 Eliminando...',
  phaseRoundEnd: '✅ Ronda completada',
  alivePlayers: '🎮 {alive} / {total} vivos',
  saveYourself: '¡Sálvate! Pisa el color:',
  roundNumber: '⚡ Ronda {round}',
  survive: '¡Sobrevive!',

  // End Screens
  youFell: '¡Te caíste!',
  stillDancing: '{count} jugadores siguen bailando...',
  lastOneWins: '¡El último en pie gana!',
  spectating: '👁 Espectador...',
  victory: '¡VICTORIA!',
  youWon: '¡Eres el último en la pista!',
  gameOver: 'FIN DEL JUEGO',
  winnerIs: '🏆 ¡Ganó {name}!',
  nobodyWon: '¡Nadie sobrevivió!',
  autoReturnIn: 'Volviendo automáticamente en {{seconds}}s...',
  backToLobby: 'Volver a la Sala',
};

