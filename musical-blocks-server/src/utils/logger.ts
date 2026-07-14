import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// Standalone fast pino logger for security logs
export const securityLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});
