# FleetCore API

A REST API for managing fleet vehicles, mechanics, workshops, and maintenance workflows. Built with NestJS, TypeScript, PostgreSQL, and TypeORM.

| Project           | Details                                                              |
| ----------------- | -------------------------------------------------------------------- |
| Repository        | [github.com/Nattrom/fleetCore](https://github.com/Nattrom/fleetCore) |
| Author            | [Nattrom](https://github.com/Nattrom)                                |
| API documentation | `http://localhost:3000/api/docs`                                     |

## Features

- JWT authentication with `ADMIN` and `TECHNICIAN` roles.
- Role-based access control and API-key authentication for integrations.
- Fleet, mechanic, workshop, and maintenance management.
- PostgreSQL schema managed through versioned migrations.
- Request validation, paginated endpoints, and normalized API responses.
- Unit and end-to-end test suites.

## Technology

- Node.js 22 LTS and npm
- NestJS and TypeScript
- PostgreSQL and TypeORM
- Jest for unit and end-to-end tests
- Docker Compose for containerized development

## Local development

### Requirements

- Node.js 22 LTS and npm
- PostgreSQL available at `localhost:5435` (or `127.0.0.1:5435`)
- Docker Compose (optional)

The default local database configuration is:

| Setting  | Value       |
| -------- | ----------- |
| Host     | `localhost` |
| Port     | `5435`      |
| Username | `postgres`  |
| Password | `postgres`  |
| Database | `fleetcore` |

The local PostgreSQL service on port `5432` is not used by this project.

### Install and run

```bash
git clone https://github.com/Nattrom/fleetCore.git
cd fleetCore
npm ci
```

Create `.env` from the example only if you do not already have a local `.env`. Review the values before starting the application, and do not overwrite an existing file that may contain local settings.

```bash
cp .env.example .env
```

Set at least `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, and `API_KEYS`. The `.env` file is excluded from Git. Use unique secrets and credentials outside local development.

Run the database migrations, load development seed data, and start the API:

```bash
npm run migration:run
npm run seed
npm run start:dev
```

The API listens at `http://localhost:3000`. Interactive Swagger documentation is available at [`/api/docs`](http://localhost:3000/api/docs), and the health endpoint is [`/health`](http://localhost:3000/health).

Database schema changes must be managed through migrations. TypeORM `synchronize` is disabled.

## Useful commands

| Command                                             | Description                                   |
| --------------------------------------------------- | --------------------------------------------- |
| `npm run start:dev`                                 | Start in development mode with hot reload     |
| `npm run build`                                     | Compile the application                       |
| `npm run start:prod`                                | Run the compiled application                  |
| `npm run lint`                                      | Run ESLint                                    |
| `npx prettier --check "src/**/*.ts" "test/**/*.ts"` | Check TypeScript formatting                   |
| `npm test -- --runInBand`                           | Run unit tests                                |
| `npm run test:watch`                                | Run tests in watch mode                       |
| `npm run test:cov -- --runInBand`                   | Run unit tests with coverage                  |
| `npm run test:e2e -- --runInBand`                   | Run end-to-end tests against `fleetcore_test` |
| `npm run migration:show`                            | Show migration status                         |
| `npm run migration:run`                             | Apply pending migrations                      |
| `npm run migration:revert`                          | Revert the most recently applied migration    |
| `npm run seed`                                      | Load development data idempotently            |

To prepare the separate database required by the end-to-end suite:

```bash
PGPASSWORD=postgres createdb -h 127.0.0.1 -p 5435 -U postgres fleetcore_test
```

The end-to-end test script targets `fleetcore_test`, not `fleetcore`. Do not point test or cleanup commands at a database containing data you need to keep.

## API overview

- `POST /auth/register` creates a `TECHNICIAN` account.
- `POST /auth/login` authenticates a user and returns a JWT.
- `GET /auth/profile` returns the authenticated user's profile.
- Business endpoints are protected by role-based authorization.
- Partner integrations use the `x-api-key` header.
- Successful and error responses include a numeric `statusCode` matching the HTTP status.

The API supports the `ADMIN` and `TECHNICIAN` roles. See the [API and permissions guide](docs/api.md) for the complete route and access-control matrix.

## Security notes

- Public registration cannot assign privileged roles.
- New passwords are hashed with bcrypt; legacy Argon2 hashes are upgraded after successful login.
- Inactive users are denied access, including when using a previously issued token.
- Development seed accounts and sample API keys are for local use only. Replace them before deployment.
- Never commit `.env` files, database dumps containing personal data, or production credentials.

## Docker Compose

Start the API and PostgreSQL services:

```bash
docker compose up --build
```

View API logs or stop the services:

```bash
docker compose logs -f api
docker compose down
```

Compose publishes PostgreSQL on host port `5435` by default and stores database files in a persistent volume. If the port is already in use, set `POSTGRES_HOST_PORT` in `.env` to a free port. The API container connects to the database service on port `5432`.

## Documentation

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [API and permissions](docs/api.md)
- [Business rules](docs/business-rules.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)
- [Operations and troubleshooting](docs/maintenance.md)

## Author

Created and maintained by [Nattrom](https://github.com/Nattrom).

Source code: [Nattrom/fleetCore](https://github.com/Nattrom/fleetCore)
