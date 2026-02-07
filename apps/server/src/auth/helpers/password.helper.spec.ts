import { PasswordHelper } from './password.helper';

describe('PasswordHelper', () => {
  describe('hash', () => {
    it('generates a bcrypt hash', async () => {
      const password = 'MyPassword123!';
      const hash = await PasswordHelper.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('produces different hashes for the same password (salt)', async () => {
      const password = 'SamePassword123!';
      const hash1 = await PasswordHelper.hash(password);
      const hash2 = await PasswordHelper.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compare', () => {
    it('returns true for matching password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await PasswordHelper.hash(password);

      const result = await PasswordHelper.compare(password, hash);
      expect(result).toBe(true);
    });

    it('returns false for wrong password', async () => {
      const password = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await PasswordHelper.hash(password);

      const result = await PasswordHelper.compare(wrongPassword, hash);
      expect(result).toBe(false);
    });

    it('returns false for empty password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await PasswordHelper.hash(password);

      const result = await PasswordHelper.compare('', hash);
      expect(result).toBe(false);
    });
  });

  describe('integration', () => {
    it('hash and compare work together correctly', async () => {
      const passwords = ['Simple123', 'Complex!@#123', '🔒🔑💻', 'a'.repeat(100)];

      for (const password of passwords) {
        const hash = await PasswordHelper.hash(password);
        const isValid = await PasswordHelper.compare(password, hash);
        expect(isValid).toBe(true);
      }
    });
  });
});
