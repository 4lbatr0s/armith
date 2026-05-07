import pino from 'pino';
import { redactForLog } from './logRedact.js';

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.apiKey',
      '*.api_key',
      '*.token',
      '*.secret',
      'headers.authorization',
      'headers.cookie'
    ],
    censor: '[Redacted]'
  },
  hooks: {
    logMethod(args, method, level) {
      if (args.length && args[0] != null && typeof args[0] === 'object' && !(args[0] instanceof Error)) {
        if (typeof args[0].then === 'function') return method.apply(this, args);
        if (Buffer.isBuffer(args[0])) return method.apply(this, args);
        args[0] = redactForLog(args[0]);
      }
      return method.apply(this, args);
    }
  },
  ...(!isProd && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  })
});

export default logger;
