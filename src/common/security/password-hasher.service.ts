import { Injectable } from '@nestjs/common';
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
      return { valid: await bcrypt.compare(password, encodedPassword) };
    }

    if (encodedPassword.startsWith('$argon2')) {
      const valid = await argon2.verify(encodedPassword, password);
      return {
        valid,
        ...(valid ? { replacementHash: await this.hash(password) } : {}),
      };
    }

    return { valid: false };
  }
}
