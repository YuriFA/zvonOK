import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.getByRole('button', { name: /login/i });
    this.registerLink = page.getByRole('link', { name: /register/i });
    this.errorAlert = page.locator('.bg-destructive\\/15');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.submit();
  }

  async expectError(message: string | RegExp) {
    await expect(this.errorAlert).toContainText(message);
  }

  async expectNoError() {
    await expect(this.errorAlert).not.toBeVisible();
  }

  async expectRedirectToLobby() {
    await expect(this.page).toHaveURL('/');
  }
}
