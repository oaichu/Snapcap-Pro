import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import config from './config.js';
import { initializeFirebase } from './services/firebase.js';
import authRoutes from './routes/auth.js';
import captureRoutes from './routes/captures.js';
import uploadRoutes from './routes/upload.js';
import subscriptionRoutes from './routes/subscription.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

initializeFirebase();

const logger = {
  info: (message, meta = {}) => console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...meta })),
  warn: (message, meta = {}) => console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...meta })),
  error: (message, meta = {}) => console.error(JSON.stringify({ level: 'error', message, timestamp: new Date().toISOString(), ...meta })),
  debug: (message, meta = {}) => {
    if (config.nodeEnv === 'development') {
      console.debug(JSON.stringify({ level: 'debug', message, timestamp: new Date().toISOString(), ...meta }));
    }
  }
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors(config.cors));

app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Too many requests, please try again later.' }
}));

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  req.startTime = Date.now();
  
  res.setHeader('X-Request-ID', req.id);
  
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - req.startTime;
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration
    });
    return originalSend.call(this, body);
  };
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/captures', captureRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/subscription', subscriptionRoutes);

// ---------------------------------------------------------------------------
// Minimal Prometheus-style metrics (no external dependency)
// ---------------------------------------------------------------------------
((app) => {
  const requestsTotal = {};
  function bump(method, status) {
    const key = `${method} ${status}`;
    requestsTotal[key] = (requestsTotal[key] || 0) + 1;
  }
  app.use((req, res, next) => {
    res.on('finish', () => bump(req.method, res.statusCode));
    next();
  });
  app.get('/api/metrics', (req, res) => {
    const lines = [];
    lines.push('# HELP snapcap_uptime_seconds Time since process start');
    lines.push('# TYPE snapcap_uptime_seconds counter');
    lines.push(`snapcap_uptime_seconds ${Math.floor(process.uptime())}`);
    lines.push('# HELP snapcap_http_requests_total Total HTTP requests by method/status');
    lines.push('# TYPE snapcap_http_requests_total counter');
    for (const [k, v] of Object.entries(requestsTotal)) {
      const [method, status] = k.split(' ');
      lines.push(`snapcap_http_requests_total{method="${method}",status="${status}"} ${v}`);
    }
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(lines.join('\n') + '\n');
  });
})(app);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`SnapCap API server running on port ${config.port}`, { port: config.port, env: config.nodeEnv });
});

const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server close', { error: err.message });
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

export default app;