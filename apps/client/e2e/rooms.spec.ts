import { test, expect } from './fixtures/auth.fixture';
import { LobbyPage } from './pages/lobby.page';
import { RoomLobbyPage } from './pages/room-lobby.page';
import { API_BASE_URL } from './utils/test-data';

test.describe('Room Creation', () => {
  test('should show create room button when authenticated', async ({ authenticatedPage }) => {
    const lobbyPage = new LobbyPage(authenticatedPage);
    await lobbyPage.goto();

    await lobbyPage.expectCreateRoomVisible();
  });

  test('should create room successfully', async ({ authenticatedPage }) => {
    const lobbyPage = new LobbyPage(authenticatedPage);
    await lobbyPage.goto();

    await lobbyPage.clickCreateRoom();

    // Dialog should open
    const dialog = authenticatedPage.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill room name
    const roomNameInput = dialog.locator('#name');
    await roomNameInput.fill('Test Room');

    // Submit form - button text is "Create Room"
    await dialog.getByRole('button', { name: /create room/i }).click();

    // Should navigate to room lobby (with /lobby suffix)
    await expect(authenticatedPage).toHaveURL(/\/room\/[^/]+\/lobby$/);
  });

  test('should require authentication for room creation', async ({ page }) => {
    const lobbyPage = new LobbyPage(page);
    await lobbyPage.goto();

    // Should show login link instead of create room button
    await lobbyPage.expectCreateRoomNotVisible();
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

    const lobbyPage = new LobbyPage(authenticatedPage);
    await lobbyPage.goto();

    await lobbyPage.joinByCode(room.slug);

    // Should navigate to room page (not room lobby) since Join Room in lobby goes to /room/:slug
    await expect(authenticatedPage).toHaveURL(new RegExp(`/room/${room.slug}$`));
  });

  test('should show error for non-existent room in lobby', async ({ page }) => {
    // Navigate directly to room lobby for non-existent room
    await page.goto('/room/non-existent-room-code-12345/lobby');

    // Wait for loading to complete and error to appear
    // The page shows "Loading room..." initially, then shows error
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.text-destructive')).toContainText(/not found/i);
  });

  test('should navigate to room lobby when clicking join', async ({ authenticatedPage, request }) => {
    // Create a room via API first
    const roomResponse = await request.post(`${API_BASE_URL}/rooms`, {
      data: {
        name: 'Test Room',
        maxParticipants: 4,
      },
    });
    expect(roomResponse.ok()).toBeTruthy();
    const room = await roomResponse.json();

    const lobbyPage = new LobbyPage(authenticatedPage);
    await lobbyPage.goto();

    await lobbyPage.joinByCode(room.slug);

    // Should be on room page (without /lobby suffix)
    await expect(authenticatedPage).toHaveURL(`/room/${room.slug}`);
  });
});

test.describe('Room Lobby', () => {
  test('should display room info', async ({ authenticatedPage, request }) => {
    // Create a room via API
    const roomResponse = await request.post(`${API_BASE_URL}/rooms`, {
      data: {
        name: 'Display Test Room',
        maxParticipants: 6,
      },
    });
    expect(roomResponse.ok()).toBeTruthy();
    const room = await roomResponse.json();

    const roomLobbyPage = new RoomLobbyPage(authenticatedPage);
    await roomLobbyPage.goto(room.slug);

    await roomLobbyPage.expectRoomLoaded('Display Test Room');
  });

  test('should show join button', async ({ authenticatedPage, request }) => {
    // Create a room via API
    const roomResponse = await request.post(`${API_BASE_URL}/rooms`, {
      data: {
        name: 'Join Button Test Room',
        maxParticipants: 4,
      },
    });
    expect(roomResponse.ok()).toBeTruthy();
    const room = await roomResponse.json();

    const roomLobbyPage = new RoomLobbyPage(authenticatedPage);
    await roomLobbyPage.goto(room.slug);

    await expect(roomLobbyPage.joinButton).toBeVisible();
    await expect(roomLobbyPage.joinButton).toBeEnabled();
  });

  test('should navigate to room when clicking join', async ({ authenticatedPage, request }) => {
    // Create a room via API
    const roomResponse = await request.post(`${API_BASE_URL}/rooms`, {
      data: {
        name: 'Navigation Test Room',
        maxParticipants: 4,
      },
    });
    expect(roomResponse.ok()).toBeTruthy();
    const room = await roomResponse.json();

    const roomLobbyPage = new RoomLobbyPage(authenticatedPage);
    await roomLobbyPage.goto(room.slug);

    await roomLobbyPage.clickJoin();

    // Should navigate to room page (without /lobby suffix)
    await expect(authenticatedPage).toHaveURL(`/room/${room.slug}`);
  });
});
