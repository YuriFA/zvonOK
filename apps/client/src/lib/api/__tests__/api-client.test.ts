import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../api-client';
import {
  ApiError,
  AuthError,
  ValidationError,
  NetworkError,
} from '../api.errors';

describe('ApiClient', () => {
  let client: ApiClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    client = new ApiClient('http://localhost:3000');
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET requests', () => {
    it('should make a GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('POST requests', () => {
    it('should make a POST request with data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 1 }),
      });

      const result = await client.post('/users', { name: 'John' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'John' }),
        })
      );
      expect(result).toEqual({ id: 1 });
    });

    it('should make a POST request without data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ success: true }),
      });

      await client.post('/action');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/action',
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('PUT requests', () => {
    it('should make a PUT request with data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ updated: true }),
      });

      const result = await client.put('/users/1', { name: 'Jane' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Jane' }),
        })
      );
      expect(result).toEqual({ updated: true });
    });
  });

  describe('DELETE requests', () => {
    it('should make a DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ deleted: true }),
      });

      const result = await client.delete('/users/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('PATCH requests', () => {
    it('should make a PATCH request with data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ patched: true }),
      });

      const result = await client.patch('/users/1', { name: 'Patched' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Patched' }),
        })
      );
      expect(result).toEqual({ patched: true });
    });
  });

  describe('204 No Content handling', () => {
    it('should return undefined for 204 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.delete('/users/1');

      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw ValidationError for 400 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad request' }),
      });

      await expect(client.get('/test')).rejects.toThrow(ValidationError);
    });

    it('should throw AuthError for 401 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });
      // Mock refresh token failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(client.get('/test')).rejects.toThrow(AuthError);
    });

    it('should throw ApiError for 403 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Forbidden' }),
      });

      await expect(client.get('/test')).rejects.toThrow(ApiError);
    });

    it('should throw ApiError for 404 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      await expect(client.get('/test')).rejects.toThrow(ApiError);
    });

    it('should throw ApiError for 409 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ message: 'Conflict' }),
      });

      await expect(client.get('/test')).rejects.toThrow(ApiError);
    });

    it('should throw ValidationError for 422 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ message: 'Unprocessable' }),
      });

      await expect(client.get('/test')).rejects.toThrow(ValidationError);
    });

    it('should throw ApiError for 500 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      try {
        await client.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Internal server error');
      }
    });
  });

  describe('token refresh', () => {
    it('should attempt token refresh on 401', async () => {
      // First request returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });
      // Refresh token succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      // Retry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' }),
      });

      const result = await client.get('/protected');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:3000/auth/refresh-token',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result).toEqual({ data: 'success' });
    });

    it('should throw AuthError when refresh fails', async () => {
      // First request returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });
      // Refresh token fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      try {
        await client.get('/protected');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).message).toBe('Session expired. Please login again.');
      }
    });

    it('should not refresh token for refresh-token endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      await expect(client.post('/auth/refresh-token')).rejects.toThrow(AuthError);

      // Should not attempt refresh (only 1 fetch call)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('network error handling', () => {
    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      try {
        await client.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).message).toBe('Network failure');
      }
    });

    it('should re-throw ApiError without wrapping', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      try {
        await client.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).not.toBeInstanceOf(NetworkError);
      }
    });

    it('should re-throw AuthError without wrapping', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      try {
        await client.get('/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect(error).not.toBeInstanceOf(NetworkError);
      }
    });
  });

  describe('error message extraction', () => {
    it('should extract message from response.message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Custom error message' }),
      });

      await expect(client.get('/test')).rejects.toThrow('Custom error message');
    });

    it('should extract message from response.error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Error from error field' }),
      });

      await expect(client.get('/test')).rejects.toThrow('Error from error field');
    });

    it('should use string response as message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve('String error'),
      });

      await expect(client.get('/test')).rejects.toThrow('String error');
    });

    it('should use default message when no message found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({}),
      });

      await expect(client.get('/test')).rejects.toThrow('An error occurred');
    });

    it('should handle non-JSON error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(client.get('/test')).rejects.toThrow(ApiError);
    });
  });

  describe('custom headers', () => {
    it('should merge custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await client.get('/test', {
        headers: { 'X-Custom': 'value' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom': 'value',
          }),
        })
      );
    });
  });
});
