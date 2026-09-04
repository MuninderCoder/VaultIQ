import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './utils/logger';
import apiV1Router from './routes/api/v1';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';

export const createApp = (): Application => {
  const app: Application = express();

  // 1. Trust proxy when behind reverse proxy (e.g. Nginx, Docker)
  app.set('trust proxy', 1);

  // 2. Defensive Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false
    })
  );

  // 3. Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    })
  );

  // 4. Request Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 5. HTTP Access Logging
  const morganStream = {
    write: (message: string) => logger.info(message.trim())
  };
  app.use(
    morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      stream: morganStream,
      skip: (req) => req.path === '/api/v1/health' // Keep health polling clean
    })
  );

  // 6. Global API Rate Limiting
  app.use('/api/', apiRateLimiter);

  // 7. API Routes
  app.use('/api/v1', apiV1Router);

  // 8. 404 & Centralized Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
