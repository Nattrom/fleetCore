import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { UserRole } from '../enums/index.js';

describe('RolesGuard', () => {
  function makeGuard(roles: UserRole[] | undefined, user?: { role: UserRole }) {
    const reflector = {
      getAllAndOverride: () => roles,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as never;
    return { guard, context };
  }

  it('allows routes without role metadata', () => {
    const { guard, context } = makeGuard(undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a user whose role is explicitly permitted', () => {
    const { guard, context } = makeGuard([UserRole.ADMIN], {
      role: UserRole.ADMIN,
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies users without a matching role', () => {
    const { guard, context } = makeGuard([UserRole.ADMIN], {
      role: UserRole.TECHNICIAN,
    });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('supports only administrator and technician roles', () => {
    expect(UserRole).toEqual({
      ADMIN: 'ADMIN',
      TECHNICIAN: 'TECHNICIAN',
    });
  });
});
