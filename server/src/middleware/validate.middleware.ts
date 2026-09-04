import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiResponseHandler } from '../utils/apiResponse';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      // Replace request with sanitized/parsed values only when present in schema
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.slice(1).join('.'),
          message: err.message
        }));

        ApiResponseHandler.error(
          res,
          'Validation failed',
          { errors: validationErrors },
          400
        );
        return;
      }
      next(error);
    }
  };
};
