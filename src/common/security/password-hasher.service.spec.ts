import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import {
  BCRYPT_COST,
  PasswordHasherService,
} from './password-hasher.service.js';

describe('PasswordHasherService', () => {
  const service = new PasswordHasherService();

  it('creates bcrypt hashes with the configured work factor', async () => {
    const hash = await service.hash('correct-horse-battery-staple');

    expect(hash.startsWith('$2')).toBe(true);
    expect(Number(hash.split('$')[2])).toBe(BCRYPT_COST);
    expect(await bcrypt.compare('correct-horse-battery-staple', hash)).toBe(
      true,
    );
  });

  it('rejects incorrect bcrypt passwords', async () => {
    const hash = await bcrypt.hash('correct-password', 4);

    await expect(
      service.verifyAndUpgrade(hash, 'incorrect-password'),
    ).resolves.toEqual({ valid: false });
  });

  it('rehashes verified Argon2 credentials as bcrypt', async () => {
    const legacyHash = await argon2.hash('legacy-password');
    const result = await service.verifyAndUpgrade(
      legacyHash,
      'legacy-password',
    );

    expect(result.valid).toBe(true);
    expect(result.replacementHash?.startsWith('$2')).toBe(true);
    expect(
      await bcrypt.compare('legacy-password', result.replacementHash!),
    ).toBe(true);
  });

  it('does not rehash an incorrect legacy password', async () => {
    const legacyHash = await argon2.hash('legacy-password');

    await expect(
      service.verifyAndUpgrade(legacyHash, 'incorrect-password'),
    ).resolves.toEqual({ valid: false });
  });

  it('fails safely for a malformed Argon2 hash', async () => {
    await expect(
      service.verifyAndUpgrade('$argon2id$corrupted-hash', 'any-password'),
    ).resolves.toEqual({ valid: false });
  });

  it('fails safely for a malformed bcrypt hash', async () => {
    await expect(
      service.verifyAndUpgrade(
        '$2b$12$not-a-valid-bcrypt-hash',
        'any-password',
      ),
    ).resolves.toEqual({ valid: false });
  });

  it('rejects unknown hash formats without throwing', async () => {
    await expect(
      service.verifyAndUpgrade('plain-text', 'plain-text'),
    ).resolves.toEqual({ valid: false });
  });

  it('performs a dummy verification without throwing', async () => {
    await expect(service.verifyDummy('any-password')).resolves.toBeUndefined();
  });
});
