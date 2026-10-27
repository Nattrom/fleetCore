# Security

- New passwords are stored using bcrypt with cost 12; they are never returned in responses.
- Existing Argon2 hashes are verified at login and rehashed with bcrypt after successful authentication. The Argon2 dependency is retained temporarily until all accounts have been migrated.
- Public registration forces the `TECHNICIAN` role; the first administrator is created with `npm run seed`.
- JWTs use a configurable secret and expiration. The strategy validates the signature/expiration and reloads the active user, role, and mechanic from PostgreSQL.
- Global authentication guards; the only roles are `ADMIN` and `TECHNICIAN`. Identity and role are reloaded from PostgreSQL, so a role included in the JWT does not grant privileges.
- Authorization is deny-by-default. After authentication, `RolesGuard` allows a route only if it is marked `@Public()` (no JWT; the API-key integration route also uses this), lists the caller's role in `@Roles(...)`, or is explicitly marked `@Authenticated()` (any active user, used only by `GET /auth/profile`). An authenticated route that declares none of these returns `403`, so a new endpoint is never exposed by omission. `src/common/guards/route-policy.spec.ts` fails if any route lacks a declaration or differs from the documented permission matrix.
- Authentication failures use generic messages: invalid, unknown, inactive, and corrupted-hash logins all return `401 Incorrect email or password`. Unknown or inactive accounts still run a dummy bcrypt verification to reduce timing differences. Deactivated users are rejected (`401`) on every request, even with a token issued earlier, because `JwtStrategy` reloads the user.
- Malformed bcrypt or Argon2 hashes fail verification safely (no `500`, no library details in the response) and are never treated as valid. Unknown hash formats are also rejected.
- Password change, password recovery, and administrative password reset are not part of the current scope and are not implemented. If added later, they must use `PasswordHasherService`. Tokens are stateless and are not revoked on password change; only deactivating the user invalidates them in practice.
- Login and registration are limited to 10 attempts per minute per IP address; excess attempts return `429`.
- Strict DTOs with `whitelist`, `forbidNonWhitelisted`, and transformation.
- Helmet, configured CORS, compression, and errors without SQL, stack traces, or secrets.
- Auditing records sanitized actions and metadata, never tokens, passwords, or keys.
- PostgreSQL constraints and transactions protect integrity and concurrency.

## Production

Set a random `JWT_SECRET` of at least 32 characters, real `API_KEYS`, and `CORS_ORIGIN` restricted to allowed origins. In production, the application rejects the sample secret, CORS `*`, and `demo-*` keys. Do not include `.env`, dumps containing personal data, or credentials in Git or Docker images.

Seeder credentials and sample API keys are for local use only. The request counter is stored in memory per instance; behind multiple instances, configure shared storage for the rate limiter or apply equivalent protection at the gateway.

Express does not trust proxies by default. When deploying behind a reverse proxy, explicitly configure the trusted proxy hops to obtain the correct client IP; do not blindly trust headers forwarded by the client.
