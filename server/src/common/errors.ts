export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: unknown;

  constructor(statusCode: number, errorCode: string, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BusinessError extends AppError {
  constructor(errorCode: string, message: string, details?: unknown) {
    super(422, errorCode, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    super(404, errorCode, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', errorCode = 'UNAUTHORIZED') {
    super(401, errorCode, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Permission denied', errorCode = 'FORBIDDEN') {
    super(403, errorCode, message);
  }
}

export class ConflictError extends AppError {
  constructor(errorCode: string, message: string, details?: unknown) {
    super(409, errorCode, message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Input validation failed', details?: unknown, statusCode = 400) {
    super(statusCode, 'VALIDATION_ERROR', message, details);
  }
}
