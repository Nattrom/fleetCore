import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { UserRole } from '../enums/index.js';
import { ANY_AUTHENTICATED_KEY } from '../decorators/authenticated.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

describe('RolesGuard', () => {
  function makeGuard(
    roles: UserRole[] | undefined,
    user?: { role: UserRole },
    flags: { isPublic?: boolean; anyAuthenticated?: boolean } = {},
  ) {
    const metadata: Record<string, unknown> = {
      [ROLES_KEY]: roles,
      [IS_PUBLIC_KEY]: flags.isPublic,
      [ANY_AUTHENTICATED_KEY]: flags.anyAuthenticated,
    };
    const reflector = {
      getAllAndOverride: (key: string) => metadata[key],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as never;
    return { guard, context };
  }

  it('allows explicitly public routes without a user', () => {
    const { guard, context } = makeGuard(undefined, undefined, {
      isPublic: true,
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies authenticated routes that declare neither roles nor @Authenticated', () => {
    const { guard, context } = makeGuard(undefined, {
      role: UserRole.ADMIN,
    });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies an empty roles list by default', () => {
    const { guard, context } = makeGuard([], { role: UserRole.ADMIN });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('allows any authenticated user on routes marked with @Authenticated', () => {
    const { guard, context } = makeGuard(
      undefined,
      { role: UserRole.TECHNICIAN },
      { anyAuthenticated: true },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies unauthenticated requests even when @Authenticated is declared', () => {
    const { guard, context } = makeGuard(undefined, undefined, {
      anyAuthenticated: true,
    });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies unauthenticated requests on role-protected routes', () => {
    const { guard, context } = makeGuard([UserRole.ADMIN]);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects an unknown role', () => {
    const { guard, context } = makeGuard(
      [UserRole.ADMIN, UserRole.TECHNICIAN],
      {
        role: 'MANAGER' as UserRole,
      },
    );
    expect(guard.canActivate(context)).toBe(false);
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
