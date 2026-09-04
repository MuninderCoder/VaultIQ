import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';

const startServer = async (): Promise<void> => {
  try {
    // 1. Establish database connection
    await connectDatabase();

    // 2. Instantiate Express application
    const app = createApp();

    // 3. Start listening on configured port
    const server = app.listen(env.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`VaultIQ API Server running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Health check available at http://localhost:${env.PORT}/api/v1/health`);
      logger.info(`=======================================================`);
    });

    // 4. Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        logger.info('Process terminated gracefully.');
        process.exit(0);
      });

      // Force shutdown after 10s if connections fail to close
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: Error) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception thrown:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Fatal error during server startup:', error);
    process.exit(1);
  }
};

startServer();
