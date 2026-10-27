import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';

export const BCRYPT_COST = 12;

export interface PasswordVerification {
  valid: boolean;
  replacementHash?: string;
}

@Injectable()
export class PasswordHasherService {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  async verifyAndUpgrade(
    encodedPassword: string,
    password: string,
  ): Promise<PasswordVerification> {
    if (encodedPassword.startsWith('$2')) {
      return { valid: await this.compareBcrypt(password, encodedPassword) };
    }

    if (encodedPassword.startsWith('$argon2')) {
      const valid = await this.verifyArgon2(encodedPassword, password);
      return {
        valid,
        ...(valid ? { replacementHash: await this.hash(password) } : {}),
      };
    }

    return { valid: false };
  }

  /**
   * Spends the same work as a real bcrypt verification so that unknown or
   * inactive accounts are not distinguishable by response time.
   */
  async verifyDummy(password: string): Promise<void> {
    this.dummyHash ??= this.hash(randomBytes(16).toString('hex'));
    await this.compareBcrypt(password, await this.dummyHash);
  }

  private dummyHash?: Promise<string>;

  private async compareBcrypt(
    password: string,
    encodedPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, encodedPassword);
    } catch {
      return false;
    }
  }

  // argon2.verify throws on malformed hashes; treat them as a failed check.
  private async verifyArgon2(
    encodedPassword: string,
    password: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(encodedPassword, password);
    } catch {
      return false;
    }
  }
}
