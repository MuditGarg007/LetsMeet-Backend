import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalError,
} from './app-error.js';

describe('AppError hierarchy', () => {
  it('should create a BadRequestError with correct status', () => {
    const err = new BadRequestError('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('bad_request');
    expect(err.message).toBe('Invalid input');
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should create an UnauthorizedError', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('unauthorized');
    expect(err.message).toBe('Unauthorized');
  });

  it('should create a ForbiddenError', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('forbidden');
  });

  it('should create a NotFoundError', () => {
    const err = new NotFoundError('User not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('User not found');
  });

  it('should create a ConflictError', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
  });

  it('should create a TooManyRequestsError', () => {
    const err = new TooManyRequestsError();
    expect(err.statusCode).toBe(429);
  });

  it('should create an InternalError as non-operational', () => {
    const err = new InternalError();
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(false);
  });

  it('should serialize to RFC 7807 JSON', () => {
    const err = new BadRequestError('Missing field', [{ field: 'email', message: 'required' }]);
    const json = err.toJSON();

    expect(json).toEqual({
      type: 'https://letsmeet.app/errors/bad_request',
      title: 'Bad Request',
      status: 400,
      detail: 'Missing field',
      errors: [{ field: 'email', message: 'required' }],
    });
  });

  it('should omit errors key when no details', () => {
    const err = new NotFoundError();
    const json = err.toJSON();

    expect(json).not.toHaveProperty('errors');
    expect(json.status).toBe(404);
  });
});
