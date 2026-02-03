import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../errors.js';
import { config } from '../../config/index.js';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formatted = err.flatten();
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: formatted.fieldErrors,
      },
    });
    return;
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    const response: Record<string, unknown> = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    if (err instanceof ValidationError && err.errors) {
      response.error = { ...response.error as object, details: err.errors };
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProduction ? 'Internal server error' : err.message,
      ...(config.isDevelopment && { stack: err.stack }),
    },
  });
};

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
};
