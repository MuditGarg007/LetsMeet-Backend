export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(params: {
    message: string;
    statusCode: number;
    code: string;
    isOperational?: boolean;
    details?: unknown;
  }) {
    super(params.message);
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.isOperational = params.isOperational ?? true;
    this.details = params.details;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      type: `https://letsmeet.app/errors/${this.code}`,
      title: this.code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      status: this.statusCode,
      detail: this.message,
      ...(this.details ? { errors: this.details } : {}),
    };
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super({ message, statusCode: 400, code: 'bad_request', details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super({ message, statusCode: 401, code: 'unauthorized' });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super({ message, statusCode: 403, code: 'forbidden' });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super({ message, statusCode: 404, code: 'not_found' });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super({ message, statusCode: 409, code: 'conflict' });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super({ message, statusCode: 429, code: 'too_many_requests' });
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super({ message, statusCode: 500, code: 'internal_error', isOperational: false });
  }
}
