import type { ApiErrorCode, ApiValidationErrorCode } from '../../../src/contracts/journalApi';

export class AppError extends Error {
  code: ApiErrorCode;
  statusCode: number;
  details?: Record<string, string>;

  constructor(code: ApiErrorCode, message: string, statusCode: number, details?: Record<string, string>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const validationError = (
  code: ApiValidationErrorCode,
  message: string,
  details?: Record<string, string>
) => new AppError(code, message, 400, details);

export const unauthorizedError = (message = 'Unauthorized') => new AppError('UNAUTHORIZED', message, 401);

export const notFoundError = (message = 'Resource not found', details?: Record<string, string>) =>
  new AppError('NOT_FOUND', message, 404, details);

export const methodNotAllowedError = (method: string, path: string) =>
  new AppError('METHOD_NOT_ALLOWED', `Method ${method} is not allowed for ${path}`, 405, { method, path });

export const internalServerError = (message = 'Internal server error') =>
  new AppError('INTERNAL_SERVER_ERROR', message, 500);

export const toAppError = (error: unknown) => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return internalServerError();
  }

  return internalServerError();
};
