import { type Page, type Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('#username');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.submitButton = page.getByRole('button', { name: /register/i });
    this.loginLink = page.getByRole('link', { name: /login/i });
    this.errorAlert = page.locator('.bg-destructive\\/15');
  }

  async goto() {
    await this.page.goto('/register');
  }

  async fillCredentials(
    username: string,
    email: string,
    password: string,
    confirmPassword?: string
  ) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword ?? password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async register(username: string, email: string, password: string) {
    await this.fillCredentials(username, email, password);
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
