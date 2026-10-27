import { SetMetadata } from '@nestjs/common';

export const ANY_AUTHENTICATED_KEY = 'anyAuthenticated';

/**
 * Explicitly allows any authenticated active user, regardless of role.
 * Authenticated routes without `@Roles` or `@Authenticated` are denied.
 */
export const Authenticated = () => SetMetadata(ANY_AUTHENTICATED_KEY, true);
