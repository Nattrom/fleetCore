# FleetCore API

REST API for managing fleet vehicles, mechanics, workshops, and maintenance. The application is built with NestJS, strict TypeScript, PostgreSQL, and TypeORM.

## Requirements

- Node.js 22 LTS and npm.
- PostgreSQL accessible at `localhost:5435` (or `127.0.0.1:5435`).
- Docker Compose, optional for running PostgreSQL and the API in containers.

The requested local configuration is:

| Parameter     | Value       |
| ------------- | ----------- |
| Host          | `localhost` |
| Port          | `5435`      |
| Username      | `postgres`  |
| Password      | `postgres`  |
| Database      | `fleetcore` |

The PostgreSQL service on port `5432` is not used for local execution.

## Installation and configuration

```bash
npm ci
```

If `.env` does not exist yet, copy `.env.example` and review its values. **Do not overwrite an existing `.env`**, as it may contain local configuration.

```bash
cp .env.example .env
```

Configure at least `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, and `API_KEYS`. The `.env` file is excluded from Git.

```bash
npm run migration:run
npm run seed
npm run start:dev
```

The API is available at `http://localhost:3000`. Migrations disable `synchronize` and are the only mechanism for modifying the schema.

## Commands

| Command                                                        | Purpose                                              |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| `npm run start:dev`                                            | Development with hot reload                          |
| `npm run build`                                                | Production build                                      |
| `npm run start:prod`                                           | Run `dist/main.js`                                    |
| `npm run migration:show`                                       | Show pending/applied migrations                      |
| `npm run migration:run`                                        | Compile and run migrations                           |
| `npm run migration:revert`                                     | Revert the latest migration                          |
| `npm run migration:create -- src/database/migrations/Name`     | Create an empty migration                            |
| `npm run migration:generate -- src/database/migrations/Name`   | Generate a migration by comparing entities and schema |
| `npm run seed`                                                 | Idempotently load demo data                          |
| `npm test -- --runInBand`                                      | Unit tests                                           |
| `npm run test:watch`                                           | Watch tests                                          |
| `npm run test:cov -- --runInBand`                              | Tests and coverage threshold                         |
| `npm run test:e2e -- --runInBand`                              | Migrate, seed, and run e2e tests in `fleetcore_test`  |
| `npm run lint`                                                 | ESLint                                               |
| `npx prettier --check "src/**/*.ts" "test/**/*.ts"`            | Check formatting                                    |

To create the schema before running e2e tests, create a separate database:

```bash
PGPASSWORD=postgres createdb -h 127.0.0.1 -p 5435 -U postgres fleetcore_test
```

The e2e command **only** targets `fleetcore_test`; it never deletes data and does not run destructive tests against `fleetcore`.

## Swagger

The OpenAPI specification is at [`http://localhost:3000/api/docs`](http://localhost:3000/api/docs). It includes DTO schemas and `x-api-key` authentication.

## Authentication, roles, and responses

- `POST /auth/register`: public registration; always creates the `TECHNICIAN` role.
- `POST /auth/login`: verifies bcrypt (and migrates legacy Argon2 hashes) and returns a JWT.
- `GET /auth/profile`: JWT profile validated against the active user in PostgreSQL.
- Supported roles: `ADMIN` and `TECHNICIAN`.
- Integrations: `x-api-key` configured in `API_KEYS`.
- Successful responses use `{ success, statusCode, data, timestamp }`; errors include `{ success:false, statusCode, message, path, timestamp }`.

Demo users and passwords are for development only:

| Role          | Username                | Password              |
| ------------- | ----------------------- | --------------------- |
| Administrator | `admin@fleetcore.local` | `FleetCoreAdmin!2026` |
| Technician 1  | `tech1@fleetcore.local` | `FleetCoreTech!2026`  |
| Technician 2  | `tech2@fleetcore.local` | `FleetCoreTech!2026`  |

The sample API keys are `demo-key-partner-1` and `demo-key-partner-2`. Replace all these values before deployment. The production configuration rejects the sample JWT secret, CORS `*`, and API keys beginning with `demo-`.

New passwords use bcrypt with cost 12. Legacy Argon2 passwords are verified during login and converted to bcrypt after successful authentication without invalidating them. After all Argon2 hashes have been migrated and no users remain pending, Argon2 compatibility and its dependency can be removed.

## Docker Compose

```bash
docker compose up --build
docker compose logs -f api
docker compose down
```

Compose creates a persistent PostgreSQL instance and an API; the API runs migrations before starting. The database service is published on host port `5435` by default. If that port is already in use by a local database, set `POSTGRES_HOST_PORT=5436` in `.env` before starting Compose. Within Docker, the API uses host `postgres` and container port `5432`; native configuration continues to use `localhost:5435`.

## Dump and restore

To include the schema, indexes, constraints, and data:

```bash
PGPASSWORD=postgres pg_dump -h 127.0.0.1 -p 5435 -U postgres \
  -d fleetcore --format=custom --no-owner --file=fleetcore.dump
```

Restore to an already-created database:

```bash
PGPASSWORD=postgres pg_restore -h 127.0.0.1 -p 5435 -U postgres \
  -d fleetcore --no-owner fleetcore.dump
```

Store dumps and credentials outside the repository. Use the actual environment credentials outside development.

## Documentation

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [API and permissions](docs/api.md)
- [Business rules](docs/business-rules.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)
- [Operations and troubleshooting](docs/maintenance.md)
