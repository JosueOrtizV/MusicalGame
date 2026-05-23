import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketServer } from 'socket.io';
import { ClientEvents, ServerEvents } from '@shared/types';
import { RoomRegistry } from './game/RoomRegistry';
import { registerHandlers } from './socket/handlers';
import { securityLogger } from './utils/logger';

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

// ---------------------------------------------------------------------------
//  Connection IP Rate Limiting Middleware (10 connections/IP/minute)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_CONNECTIONS_PER_WINDOW = 10;
const ipConnections = new Map<string, number[]>();

function getClientIp(socket: any): string {
  const xForwardedFor = socket.handshake.headers['x-forwarded-for'];
  if (xForwardedFor) {
    if (typeof xForwardedFor === 'string') return xForwardedFor.split(',')[0].trim();
    if (Array.isArray(xForwardedFor)) return xForwardedFor[0].trim();
  }
  return socket.handshake.address || socket.conn.remoteAddress || 'unknown';
}

io.use((socket, next) => {
  const ip = getClientIp(socket);
  const now = Date.now();
  
  let timestamps = ipConnections.get(ip) || [];
  timestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (timestamps.length >= MAX_CONNECTIONS_PER_WINDOW) {
    securityLogger.warn({ ip, count: timestamps.length }, 'Rate limit exceeded: IP connection spam blocked');
    return next(new Error('Rate limit exceeded. Please wait a minute before reconnecting.'));
  }
  
  timestamps.push(now);
  ipConnections.set(ip, timestamps);
  next();
});

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
