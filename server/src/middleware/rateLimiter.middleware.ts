import rateLimit from 'express-rate-limit';
import { ApiResponseHandler } from '../utils/apiResponse';

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 20, // Much higher in dev to prevent blocking tests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ApiResponseHandler.error(
      res,
      'Too many authentication requests from this IP. Please try again after 15 minutes.',
      null,
      429
    );
  }
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 5000 : 300, // Extremely high in dev for hot-reloads and testing
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ApiResponseHandler.error(
      res,
      'Too many API requests from this IP. Please slow down.',
      null,
      429
    );
  }
});
