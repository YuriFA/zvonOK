import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export class PasswordHelper {
  static hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
