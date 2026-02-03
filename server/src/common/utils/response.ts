import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: SuccessResponse<T>['meta']
) {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T) {
  sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response) {
  res.status(204).send();
}
