/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, type Page } from '@playwright/test';
import { API_BASE_URL, generateTestUser } from '../utils/test-data';

type TestUser = ReturnType<typeof generateTestUser>;

interface AuthFixtures {
  /**
   * Login via API and return the authenticated page context
   */
  loginViaApi: (email: string, password: string) => Promise<void>;
  /**
   * Register a new user via API and return credentials
   */
  registerViaApi: () => Promise<TestUser>;
  /**
   * Pre-authenticated page for tests that require login
   */
  authenticatedPage: Page;
  /**
   * Test user credentials for authenticated tests
   */
  testUser: TestUser;
}

export const test = base.extend<AuthFixtures>({
  loginViaApi: async ({ request }, use) => {
    const loginFn = async (email: string, password: string) => {
      const response = await request.post(`${API_BASE_URL}/auth/login`, {
        data: { email, password },
      });
      if (!response.ok()) {
        throw new Error(`Login failed: ${response.status()}`);
      }
    };
    await use(loginFn);
  },

  registerViaApi: async ({ request }, use) => {
    const registerFn = async () => {
      const user = generateTestUser();
      const response = await request.post(`${API_BASE_URL}/auth/register`, {
        data: {
          email: user.email,
          username: user.username,
          password: user.password,
        },
      });
      if (!response.ok()) {
        throw new Error(`Registration failed: ${response.status()}`);
      }
      return user;
    };
    await use(registerFn);
  },

  authenticatedPage: async ({ browser, registerViaApi }, use) => {
    const user = await registerViaApi();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login via API and get cookies
    const request = context.request;
    await request.post(`${API_BASE_URL}/auth/login`, {
      data: { email: user.email, password: user.password },
    });

    await use(page);
    await context.close();
  },

  testUser: async ({ registerViaApi }, use) => {
    const user = await registerViaApi();
    await use(user);
  },
});

export { expect } from '@playwright/test';
