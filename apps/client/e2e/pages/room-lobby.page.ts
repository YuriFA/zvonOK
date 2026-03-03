import { type Page, type Locator, expect } from '@playwright/test';

export class RoomLobbyPage {
  readonly page: Page;
  readonly roomName: Locator;
  readonly roomCode: Locator;
  readonly joinButton: Locator;
  readonly backButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.roomName = page.locator('h1');
    this.roomCode = page.locator('p', { hasText: /code:/i });
    // Button text is "Join Room" (case-sensitive match)
    this.joinButton = page.getByRole('button', { name: 'Join Room' });
    this.backButton = page.getByRole('link', { name: /back to lobby/i });
    this.errorMessage = page.locator('.text-destructive');
  }

  async goto(slug: string) {
    await this.page.goto(`/room/${slug}/lobby`);
  }

  async clickJoin() {
    await this.joinButton.click();
  }

  async expectRoomLoaded(name?: string) {
    await expect(this.joinButton).toBeVisible();
    if (name) {
      await expect(this.roomName).toContainText(name);
    }
  }

  async expectError(message?: string | RegExp) {
    await expect(this.errorMessage.first()).toBeVisible();
    if (message) {
      await expect(this.errorMessage.first()).toContainText(message);
    }
  }

  async expectRedirectToRoom(slug: string) {
    await expect(this.page).toHaveURL(`/room/${slug}/lobby`);
  }
}
