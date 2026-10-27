import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard.js';

describe('ApiKeyGuard', () => {
  const context = (key?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ header: () => key }),
      }),
    }) as never;

  it('accepts a configured API key', () => {
    const guard = new ApiKeyGuard({
      get: () => ['partner-secret'],
    } as never);

    expect(guard.canActivate(context('partner-secret'))).toBe(true);
  });

  it.each([undefined, 'wrong-key'])(
    'rejects missing or invalid keys',
    (key) => {
      const guard = new ApiKeyGuard({
        get: () => ['partner-secret'],
      } as never);

      expect(() => guard.canActivate(context(key))).toThrow(
        UnauthorizedException,
      );
    },
  );

  it('rejects an empty configured key list', () => {
    const guard = new ApiKeyGuard({ get: () => [] } as never);

    expect(() => guard.canActivate(context('partner-secret'))).toThrow(
      UnauthorizedException,
    );
  });
});
