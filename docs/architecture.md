# Architecture

FleetCore uses NestJS modules organized by domain. Controllers validate and route requests; services contain business rules and use TypeORM repositories; entities describe the persistent model. `AppModule` configures PostgreSQL, validated configuration, authentication, and domain modules.

## Modules

- `auth`: registration, login, JWT, identity validation, and profile.
- `users`: administrative creation, safe lookup, and activation/deactivation.
- `vehicles`: vehicles, license plate normalization, and soft deactivation.
- `mechanics`: technicians, optional user link, and availability.
- `workshops`: workshops and activation/deactivation.
- `maintenances`: planning, assignment, transitions, closures, and history.
- `integrations`: paginated history lookup protected by an API key.
- `audit`: logging of relevant, sanitized operations.
- `common`: shared guards, decorators, pagination, responses, and exceptions.
- `database`: CLI data source, migrations, and seeder.

## HTTP request flow

1. `ValidationPipe` transforms and validates DTOs; unknown fields are rejected.
2. `JwtAuthGuard` protects routes by default, except routes marked `@Public()`.
3. `RolesGuard` validates the role obtained from the identity reloaded from PostgreSQL.
4. `ApiKeyGuard` independently protects the integration route.
5. The service executes domain rules and transactions when multiple writes are involved.
6. `ResponseInterceptor` wraps successful responses, and the global filter normalizes errors.

## Key decisions

- TypeScript `strict` and ESM modules.
- TypeORM with versioned migrations; `synchronize` remains disabled.
- IDs are UUIDs; monetary values are stored as `numeric(12,2)` in PostgreSQL.
- PostgreSQL constraints complement service-level checks for concurrency.
- Pagination has a maximum page size of 100; full history is not loaded by default.
- The container uses a multi-stage build and runs the process as the unprivileged `node` user.

Caching, queues, and microservices are not included because they are unnecessary for current workflows.
