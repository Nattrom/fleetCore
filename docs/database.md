# Database

The application connects locally to PostgreSQL at `localhost:5435`, database `fleetcore`. Migrations are in `src/database/migrations`; apply changes with `npm run migration:run`. Do not enable `synchronize` in production.

## Model

- `users`: name, normalized email, Argon2 hash, role, and active status.
- `vehicles`: normalized license plate, make/model, year, mileage, and availability.
- `mechanics`: mechanic details and optional unique link to a `TECHNICIAN` user.
- `workshops`: name, address, and active status.
- `maintenances`: vehicle, mechanic, workshop, type, schedule, status, and closure information.
- `audit_logs`: optional responsible user, action, entity, identifier, sanitized JSONB details, and timestamp.

Vehicles, mechanics, and workshops have a one-to-many relationship with maintenance records. Foreign keys use `RESTRICT` to protect history; audit records set the user to `NULL` when an identity is deleted, although operational resources are not physically deleted.

## Integrity and indexes

- Unique indexes on normalized email and license plate.
- Maintenance indexes by vehicle/date, mechanic/status/date, workshop, and status/date.
- Operational status indexes for vehicles, mechanics, and workshops.
- Audit indexes by date and by user/action/date.
- Partial unique index per vehicle to prevent more than one `SCHEDULED` or `IN_PROGRESS` status.
- GiST exclusion constraint on mechanic and interval `[scheduled_at, scheduled_end_at)` to prevent concurrent active overlaps.
- Checks for years, mileage, intervals, and cost; a `COMPLETED` closure requires work, cost, date, and final mileage.

The PostgreSQL `btree_gist` extension supports the schedule constraint. The driver may enable `uuid-ossp` for UUID generation.

Migration `1761562000000` limits the enum to `ADMIN` and `TECHNICIAN`. Accounts with the `MANAGER` role are retained as inactive `TECHNICIAN` accounts; an auxiliary table preserves their previous role/status so that `down` can restore them. No accounts are deleted. An administrator must review and explicitly reactivate each account if appropriate. Do not revert the migration in production without considering that the previous role will be re-enabled.

## Migrations

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
```

After changing entities, generate a migration, review it, and run it. Never edit a migration that has already been applied in a shared environment; create a new migration instead.
