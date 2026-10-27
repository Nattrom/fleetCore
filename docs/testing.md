# Testing

## Unit tests

```bash
npm test -- --runInBand
npm run test:watch
npm run test:cov -- --runInBand
```

Jest globally requires at least 40% line and statement coverage, and 35% function and branch coverage. Tests cover authentication/bcrypt, Argon2 hash transitions (including malformed hashes), the authorization guard and a per-route permission matrix, JWT strategy behavior for active/inactive users and stale role claims, DTO validation of privileged properties, filtering, interceptors, auditing, integrations, resources, maintenance, and transitions. The E2E suite also verifies deactivated users with previously issued tokens, endpoint permissions for technicians and anonymous callers, and that the HTTP status always equals the JSON `statusCode`.

## PostgreSQL e2e

Tests use a separate `fleetcore_test` database; they do not target `fleetcore` or delete tables/data.

```bash
PGPASSWORD=postgres createdb -h 127.0.0.1 -p 5435 -U postgres fleetcore_test
npm run test:e2e -- --runInBand
```

The script applies migrations, runs the idempotent seeder, and then tests real HTTP requests against NestJS and PostgreSQL. PostgreSQL for testing must be available on the configured development port, `5435`.

To manually verify idempotency:

```bash
DB_NAME=fleetcore_test npm run seed
DB_NAME=fleetcore_test npm run seed
```

Do not run integration tests that clean or reset the `fleetcore` database.
