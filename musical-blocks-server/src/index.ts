import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketServer } from 'socket.io';
import { ClientEvents, ServerEvents } from '@shared/types';
import { RoomRegistry } from './game/RoomRegistry';
import { registerHandlers } from './socket/handlers';

// ---------------------------------------------------------------------------
//  Environment
// ---------------------------------------------------------------------------
const PORT   = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT = process.env.CLIENT_ORIGIN ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
//  Fastify
// ---------------------------------------------------------------------------
const app = Fastify({
  logger: {
    transport: { target: 'pino-pretty' },
  },
});

app.register(cors, {
  origin: '*', // Allow any origin for LAN testing
  methods: ['GET', 'POST', 'OPTIONS'],
});

// ---------------------------------------------------------------------------
//  Socket.io — created before routes so registry is available
// ---------------------------------------------------------------------------
const io = new SocketServer<ClientEvents, ServerEvents>({
  cors: {
    origin: '*', // Allow any origin for LAN testing
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

const registry = new RoomRegistry(io);

// Attach Socket.io to Fastify's raw HTTP server after it's ready
app.addHook('onReady', async () => {
  io.attach(app.server);
  io.on('connection', (socket) => {
    registerHandlers(io, socket, registry);
  });
});

// ---------------------------------------------------------------------------
//  REST routes (registered before server starts — Fastify requirement)
// ---------------------------------------------------------------------------
app.get('/health', async () => ({ status: 'ok', ts: Date.now() }));
app.get('/rooms',  async () => registry.getPublicList());

// ---------------------------------------------------------------------------
//  Start
// ---------------------------------------------------------------------------
app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`\n🎵 Musical Blocks Server → http://localhost:${PORT}`);
  console.log(`   WebSocket origin: ${CLIENT}\n`);
});
