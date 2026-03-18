import { test, expect } from './fixtures/auth.fixture';
import { HomePage } from './pages/home.page';
import { API_BASE_URL } from './utils/test-data';

test.describe('Room Creation', () => {
  test('should show create room button when authenticated', async ({ authenticatedPage }) => {
    const homePage = new HomePage(authenticatedPage);
    await homePage.goto();

    await homePage.expectCreateRoomVisible();
  });

  test('should create room successfully', async ({ authenticatedPage }) => {
    const homePage = new HomePage(authenticatedPage);
    await homePage.goto();

    await homePage.clickCreateRoom();

    // Dialog should open
    const dialog = authenticatedPage.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill room name
    const roomNameInput = dialog.locator('#name');
    await roomNameInput.fill('Test Room');

    // Submit form - button text is "Create Room"
    await dialog.getByRole('button', { name: /create room/i }).click();

    // Should navigate to room page (pre-join state)
    await expect(authenticatedPage).toHaveURL(/\/room\/[^/]+$/);
  });

  test('should require authentication for room creation', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Should show login link instead of create room button
    await homePage.expectCreateRoomNotVisible();
    // Use .first() because there may be multiple login links (header + button)
    await expect(page.getByRole('link', { name: /login/i }).first()).toBeVisible();
  });
});

test.describe('Room Joining', () => {
  test('should join room by code successfully', async ({ authenticatedPage, request }) => {
    // Create a room via API first
    const roomResponse = await request.post(`${API_BASE_URL}/rooms`, {
      data: {
        name: 'Test Room for Joining',
        maxParticipants: 4,
      },
    });
    expect(roomResponse.ok()).toBeTruthy();
    const room = await roomResponse.json();

    const homePage = new HomePage(authenticatedPage);
    await homePage.goto();

    await homePage.joinByCode(room.slug);

    // Should navigate to room page (pre-join state)
    await expect(authenticatedPage).toHaveURL(new RegExp(`/room/${room.slug}$`));
  });

  test('should show error for non-existent room', async ({ page }) => {
    // Navigate directly to room page for non-existent room
    await page.goto('/room/non-existent-room-code-12345');

    // Wait for loading to complete and error to appear
    // The page shows "Loading room..." initially, then shows error
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.text-destructive')).toContainText(/not found/i);
  });

  test('should navigate to room page when clicking join', async ({ authenticatedPage, request }) => {
    // Create a room via API first
    const roomResponse = await request.post(`${API_BASE_URL}/rooms`, {
      data: {
        name: 'Test Room',
        maxParticipants: 4,
      },
    });
    expect(roomResponse.ok()).toBeTruthy();
    const room = await roomResponse.json();

    const homePage = new HomePage(authenticatedPage);
    await homePage.goto();

    await homePage.joinByCode(room.slug);

    // Should be on room page (pre-join state)
    await expect(authenticatedPage).toHaveURL(`/room/${room.slug}`);
  });
});
