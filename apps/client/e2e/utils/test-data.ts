/**
 * Test data for e2e tests
 */

export function generateTestUser() {
  const timestamp = Date.now();
  return {
    email: `e2e-${timestamp}@example.com`,
    username: `e2e-user-${timestamp}`,
    password: 'TestPass123',
  };
}

export const API_BASE_URL = 'http://localhost:3000';
