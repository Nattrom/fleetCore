# Operations and troubleshooting

## Local startup

1. Confirm that PostgreSQL accepts connections at `127.0.0.1:5435`.
2. Check the variables in `.env`; the default local port is `5435`.
3. Run `npm run migration:show` and `npm run migration:run`.
4. For development data, run `npm run seed`.
5. Start with `npm run start:dev`; health check at `/health` and Swagger at `/api/docs`.

## Docker

```bash
docker compose up --build
docker compose logs -f api
docker compose logs -f postgres
docker compose down
```

The `fleetcore-postgres` volume retains data when containers are stopped. If another service is already using host port `5435`, set `POSTGRES_HOST_PORT=5436` for Compose or run the API natively against the existing PostgreSQL instance.

## Common errors

- **Connection refused:** check the host, port `5435`, database, and credentials; do not switch to `5432`.
- **Relation or column does not exist:** apply pending migrations; do not enable `synchronize`.
- **`btree_gist` unavailable:** install/enable the extension using a PostgreSQL account with the required permissions, then rerun the migration.
- **JWT or API key rejected:** check `JWT_SECRET`, `JWT_EXPIRES_IN`, and `API_KEYS`; do not paste secrets into logs or issue reports.
- **`409` conflict:** check for vehicles with active maintenance, mechanic schedule conflicts, and inactive resources.
- **Docker does not publish port 5435:** set `POSTGRES_HOST_PORT` to a free port and keep `DB_PORT=5435` for native execution.

## Dump PostgreSQL

```bash
PGPASSWORD=postgres pg_dump -h 127.0.0.1 -p 5435 -U postgres \
  -d fleetcore --format=custom --no-owner --file=fleetcore.dump
```

The dump contains data; store it encrypted and outside the repository. To restore, create the target database first and use `pg_restore`.
