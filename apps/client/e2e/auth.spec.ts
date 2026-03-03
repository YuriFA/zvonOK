import { test, expect } from './fixtures/auth.fixture';
import { LoginPage } from './pages/login.page';
import { RegisterPage } from './pages/register.page';
import { LobbyPage } from './pages/lobby.page';
import { generateTestUser } from './utils/test-data';

test.describe('Registration', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test('should display registration form', async () => {
    await expect(registerPage.usernameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
  });

  test('should submit registration form without validation errors', async () => {
    const user = generateTestUser();

    await registerPage.register(user.username, user.email, user.password);

    // Form should not show validation errors
    // Note: Cross-origin cookies may not work in test environment
    await registerPage.expectNoError();
  });

  test('should show validation errors for invalid inputs', async () => {
    // Empty form submission
    await registerPage.submit();

    // Should show at least one validation error
    await expect(registerPage.page.locator('.text-destructive').first()).toBeVisible();
  });

  test('should show error for password mismatch', async () => {
    const user = generateTestUser();

    await registerPage.fillCredentials(user.username, user.email, 'Password123', 'Different456');
    await registerPage.submit();

    await expect(registerPage.page.locator('.text-destructive').first()).toBeVisible();
  });
});

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form', async () => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ testUser }) => {
    await loginPage.login(testUser.email, testUser.password);

    await loginPage.expectNoError();
    await loginPage.expectRedirectToLobby();
  });

  test('should show error for invalid credentials', async () => {
    await loginPage.login('nonexistent@example.com', 'WrongPassword123');

    await loginPage.expectError(/invalid/i);
  });

  test('should show validation errors for empty fields', async () => {
    await loginPage.submit();

    await expect(loginPage.page.locator('.text-destructive').first()).toBeVisible();
  });

  test('should redirect to previous page after login', async ({ testUser, page }) => {
    // Try to access a protected action, get redirected to login with redirect param
    await page.goto('/login?redirect=/');

    await loginPage.login(testUser.email, testUser.password);

    // Should redirect back to the original page
    await expect(page).toHaveURL('/');
  });
});

test.describe('Logout', () => {
  test('should logout successfully', async ({ authenticatedPage }) => {
    const lobbyPage = new LobbyPage(authenticatedPage);
    await lobbyPage.goto();

    // Verify user is authenticated - create room button should be visible
    await lobbyPage.expectCreateRoomVisible();

    // Click on the button that contains the username (opens dropdown)
    await authenticatedPage.locator('button').filter({ hasText: /e2e-user/ }).click();

    // Click logout in dropdown
    await authenticatedPage.getByText('Logout').click();

    // Should show login prompt (unauthenticated state)
    await lobbyPage.expectLoginPromptVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should show login prompt in lobby when unauthenticated', async ({ page }) => {
    const lobbyPage = new LobbyPage(page);
    await lobbyPage.goto();

    // Should show login button for unauthenticated users
    await expect(page.getByRole('link', { name: /login/i }).first()).toBeVisible();
    await lobbyPage.expectCreateRoomNotVisible();
  });

  test('should show create room button when authenticated', async ({ authenticatedPage }) => {
    const lobbyPage = new LobbyPage(authenticatedPage);
    await lobbyPage.goto();

    await lobbyPage.expectCreateRoomVisible();
  });
});
