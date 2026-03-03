import { type Page, type Locator, expect } from '@playwright/test';

export class LobbyPage {
  readonly page: Page;
  readonly roomCodeInput: Locator;
  readonly joinRoomButton: Locator;
  readonly createRoomButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.roomCodeInput = page.locator('input[placeholder*="room code" i]');
    this.joinRoomButton = page.getByRole('button', { name: /^join room$/i });
    this.createRoomButton = page.getByRole('button', { name: /create room/i });
  }

  async goto() {
    await this.page.goto('/');
  }

  async enterRoomCode(code: string) {
    await this.roomCodeInput.fill(code);
  }

  async clickJoinRoom() {
    await this.joinRoomButton.click();
  }

  async clickCreateRoom() {
    await this.createRoomButton.click();
  }

  async joinByCode(code: string) {
    await this.enterRoomCode(code);
    await this.clickJoinRoom();
  }

  async expectCreateRoomVisible() {
    await expect(this.createRoomButton).toBeVisible();
  }

  async expectCreateRoomNotVisible() {
    await expect(this.createRoomButton).not.toBeVisible();
  }

  async expectLoginPromptVisible() {
    // Login link should be visible for unauthenticated users
    // Use .first() because there may be multiple login links (header + button)
    await expect(this.page.getByRole('link', { name: /login/i }).first()).toBeVisible();
  }

  async expectRedirectToRoomLobby(slug: string) {
    await expect(this.page).toHaveURL(new RegExp(`/room/${slug}`));
  }
}
