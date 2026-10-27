# Operación y solución de problemas

## Inicio local

1. Confirma que PostgreSQL acepte conexiones en `127.0.0.1:5435`.
2. Verifica las variables en `.env`; el puerto local por defecto es `5435`.
3. Ejecuta `npm run migration:show` y `npm run migration:run`.
4. Para datos de desarrollo, ejecuta `npm run seed`.
5. Inicia con `npm run start:dev`; salud en `/health` y Swagger en `/api/docs`.

## Docker

```bash
docker compose up --build
docker compose logs -f api
docker compose logs -f postgres
docker compose down
```

El volumen `fleetcore-postgres` conserva los datos al detener contenedores. Si ya hay otro servicio en host `5435`, establece `POSTGRES_HOST_PORT=5436` para Compose o ejecuta la API nativamente contra el PostgreSQL existente.

## Errores frecuentes

- **Conexión rechazada:** comprueba host, puerto `5435`, base y credenciales; no cambies a `5432`.
- **Relación o columna inexistente:** aplica migraciones pendientes, no habilites `synchronize`.
- **`btree_gist` no disponible:** instala/habilita la extensión con una cuenta PostgreSQL que tenga permisos y vuelve a ejecutar la migración.
- **JWT o API Key rechazados:** revisa `JWT_SECRET`, `JWT_EXPIRES_IN` y `API_KEYS`; no pegues secretos en logs o incidencias.
- **Conflicto `409`:** revisa vehículos con intervención activa, intervalos del mecánico y estado activo de los recursos.
- **Docker no publica 5435:** configura `POSTGRES_HOST_PORT` a un puerto libre y conserva `DB_PORT=5435` para la ejecución nativa.

## Dump PostgreSQL

```bash
PGPASSWORD=postgres pg_dump -h 127.0.0.1 -p 5435 -U postgres \
  -d fleetcore --format=custom --no-owner --file=fleetcore.dump
```

El dump contiene datos; almacénalo cifrado y fuera del repositorio. Para restaurar, crea previamente la base objetivo y usa `pg_restore`.
