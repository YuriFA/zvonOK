import { describe, it, expect } from 'vitest';
import {
  ApiError,
  AuthError,
  ValidationError,
  NetworkError,
} from '../api.errors';

describe('ApiError', () => {
  it('should create an ApiError with message and status', () => {
    const error = new ApiError('Not found', 404);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.name).toBe('ApiError');
  });

  it('should create an ApiError with details', () => {
    const details = { field: 'email', reason: 'invalid' };
    const error = new ApiError('Validation failed', 400, details);

    expect(error.details).toEqual(details);
  });

  it('should map status code 400 to BAD_REQUEST', () => {
    const error = new ApiError('Bad request', 400);
    expect(error.code).toBe('BAD_REQUEST');
  });

  it('should map status code 401 to UNAUTHORIZED', () => {
    const error = new ApiError('Unauthorized', 401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('should map status code 403 to FORBIDDEN', () => {
    const error = new ApiError('Forbidden', 403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('should map status code 404 to NOT_FOUND', () => {
    const error = new ApiError('Not found', 404);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('should map status code 409 to CONFLICT', () => {
    const error = new ApiError('Conflict', 409);
    expect(error.code).toBe('CONFLICT');
  });

  it('should map status code 422 to UNPROCESSABLE_ENTITY', () => {
    const error = new ApiError('Unprocessable', 422);
    expect(error.code).toBe('UNPROCESSABLE_ENTITY');
  });

  it('should map status code 500 to INTERNAL_SERVER_ERROR', () => {
    const error = new ApiError('Server error', 500);
    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should map unknown status codes to UNKNOWN_ERROR', () => {
    const error = new ApiError('Unknown', 418);
    expect(error.code).toBe('UNKNOWN_ERROR');
  });
});

describe('AuthError', () => {
  it('should create an AuthError with default status 401', () => {
    const error = new AuthError('Token expired');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(AuthError);
    expect(error.message).toBe('Token expired');
    expect(error.status).toBe(401);
    expect(error.name).toBe('AuthError');
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('should create an AuthError with custom status', () => {
    const error = new AuthError('Forbidden', 403);

    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('should create an AuthError with details', () => {
    const details = { reason: 'token_expired' };
    const error = new AuthError('Session expired', 401, details);

    expect(error.details).toEqual(details);
  });
});

describe('ValidationError', () => {
  it('should create a ValidationError with status 400', () => {
    const error = new ValidationError('Invalid input');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Invalid input');
    expect(error.status).toBe(400);
    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe('BAD_REQUEST');
  });

  it('should create a ValidationError with details', () => {
    const details = { fields: ['email', 'password'] };
    const error = new ValidationError('Multiple fields invalid', details);

    expect(error.details).toEqual(details);
  });
});

describe('NetworkError', () => {
  it('should create a NetworkError', () => {
    const error = new NetworkError('Connection refused');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toBe('Connection refused');
    expect(error.name).toBe('NetworkError');
  });

  it('should not have status property', () => {
    const error = new NetworkError('Offline');

    expect('status' in error).toBe(false);
  });
});
