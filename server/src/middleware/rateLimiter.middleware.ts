import rateLimit from 'express-rate-limit';
import { ApiResponseHandler } from '../utils/apiResponse';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
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
  max: 300, // Limit each IP to 300 requests per windowMs
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
