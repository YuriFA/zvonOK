import { RefreshTokenHelper } from './refresh-token.helper';

describe('RefreshTokenHelper', () => {
  const sampleToken = 'sample-refresh-token-123';

  describe('hash', () => {
    it('produces consistent SHA256 hash for same input', () => {
      const hash1 = RefreshTokenHelper.hash(sampleToken);
      const hash2 = RefreshTokenHelper.hash(sampleToken);

      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = RefreshTokenHelper.hash('token-one');
      const hash2 = RefreshTokenHelper.hash('token-two');

      expect(hash1).not.toBe(hash2);
    });

    it('returns hex-encoded hash of correct length', () => {
      const hash = RefreshTokenHelper.hash(sampleToken);

      // SHA256 produces 256 bits = 64 hex characters
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is different from bcrypt hash format', () => {
      const sha256Hash = RefreshTokenHelper.hash(sampleToken);

      // bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(sha256Hash).not.toMatch(/^\$2[aby]\$/);
    });
  });

  describe('compare', () => {
    it('returns true for matching token', () => {
      const hash = RefreshTokenHelper.hash(sampleToken);

      const result = RefreshTokenHelper.compare(sampleToken, hash);
      expect(result).toBe(true);
    });

    it('returns false for non-matching token', () => {
      const hash = RefreshTokenHelper.hash(sampleToken);

      const result = RefreshTokenHelper.compare('wrong-token', hash);
      expect(result).toBe(false);
    });

    it('returns false for empty token', () => {
      const hash = RefreshTokenHelper.hash(sampleToken);

      const result = RefreshTokenHelper.compare('', hash);
      expect(result).toBe(false);
    });

    it('returns false for different length hashes', () => {
      const shortHash = 'abc';

      const result = RefreshTokenHelper.compare(sampleToken, shortHash);
      expect(result).toBe(false);
    });

    it('uses timing-safe comparison (constant-time)', () => {
      // This test verifies that the comparison doesn't short-circuit early
      // We can't truly test timing safety in unit tests, but we can
      // verify the function completes without throwing for various inputs
      const hash = RefreshTokenHelper.hash(sampleToken);

      // These should all complete without throwing, regardless of where
      // the mismatch occurs in the string
      expect(() => RefreshTokenHelper.compare('a', hash)).not.toThrow();
      expect(() => RefreshTokenHelper.compare('aaaaaaaaaaaaaaaaaaaa', hash)).not.toThrow();
      expect(() => RefreshTokenHelper.compare(sampleToken.slice(0, 5), hash)).not.toThrow();
    });
  });

  describe('integration', () => {
    it('hash and compare work together correctly', () => {
      const tokens = [
        'simple-token',
        'complex-token-with-special-chars-!@#$%',
        'unicode-token-🔒🔑',
        'very-long-token-' + 'a'.repeat(1000),
      ];

      for (const token of tokens) {
        const hash = RefreshTokenHelper.hash(token);
        const isValid = RefreshTokenHelper.compare(token, hash);
        expect(isValid).toBe(true);
      }
    });

    it('correctly rejects similar but different tokens', () => {
      const original = 'my-refresh-token-123';
      const similar = 'my-refresh-token-124'; // Only one character different

      const hash = RefreshTokenHelper.hash(original);

      expect(RefreshTokenHelper.compare(original, hash)).toBe(true);
      expect(RefreshTokenHelper.compare(similar, hash)).toBe(false);
    });

    it('handles empty string token', () => {
      const emptyToken = '';
      const hash = RefreshTokenHelper.hash(emptyToken);

      expect(RefreshTokenHelper.compare(emptyToken, hash)).toBe(true);
      expect(RefreshTokenHelper.compare('not-empty', hash)).toBe(false);
    });
  });

  describe('security properties', () => {
    it('produces hash that does not reveal original token', () => {
      const token = 'secret-refresh-token';
      const hash = RefreshTokenHelper.hash(token);

      // Hash should not contain the original token
      expect(hash).not.toContain(token);
      expect(hash).not.toContain('secret');
    });

    it('is deterministic (same input, same output)', () => {
      // Run multiple times to ensure consistency
      const hashes = Array.from({ length: 10 }, () =>
        RefreshTokenHelper.hash(sampleToken),
      );

      hashes.forEach((hash) => {
        expect(hash).toBe(hashes[0]);
      });
    });
  });
});
