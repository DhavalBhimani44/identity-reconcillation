import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`Error: ${error.message}`);
  res.status(500).json({
    status: 'error',
    message: error.message || 'Internal Server Error',
  });
};