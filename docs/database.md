# Base de datos

La aplicación se conecta localmente a PostgreSQL en `localhost:5435`, base `fleetcore`. Las migraciones están en `src/database/migrations`; aplica cambios con `npm run migration:run`. No habilites `synchronize` en producción.

## Modelo

- `users`: nombre, correo normalizado, hash Argon2, rol y estado activo.
- `vehicles`: placa normalizada, marca/modelo, año, kilometraje y disponibilidad.
- `mechanics`: datos del mecánico y vínculo opcional único a un usuario `TECHNICIAN`.
- `workshops`: nombre, dirección y estado activo.
- `maintenances`: vehículo, mecánico, taller, tipo, agenda, estado e información de cierre.
- `audit_logs`: usuario responsable opcional, acción, entidad, identificador, detalles JSONB sanitizados y fecha.

Vehículo, mecánico y taller tienen relación uno-a-muchos con mantenimientos. Las claves foráneas usan `RESTRICT` para proteger el historial; la auditoría pone el usuario a `NULL` al eliminar una identidad, aunque los recursos operativos no se eliminan físicamente.

## Integridad e índices

- Índices únicos sobre correo y placa normalizados.
- Índices de mantenimiento por vehículo/fecha, mecánico/estado/fecha, taller y estado/fecha.
- Índices de estado operativo para vehículos, mecánicos y talleres.
- Índices de auditoría por fecha y por usuario/acción/fecha.
- Índice único parcial por vehículo para impedir más de un estado `SCHEDULED` o `IN_PROGRESS`.
- Restricción de exclusión GiST sobre mecánico e intervalo `[scheduled_at, scheduled_end_at)` para impedir solapamientos activos concurrentes.
- Checks de años, kilometrajes, intervalos y coste; un cierre `COMPLETED` requiere trabajo, coste, fecha y kilometraje final.

La extensión PostgreSQL `btree_gist` respalda la restricción de agenda. El driver puede habilitar `uuid-ossp` para generación de UUID.

La migración `1761562000000` limita el enum a `ADMIN` y `TECHNICIAN`. Las cuentas que tenían rol `MANAGER` se conservan como `TECHNICIAN` inactivas; una tabla auxiliar conserva su rol/estado anterior para que el `down` pueda restaurarlos. No se eliminan cuentas. Un administrador debe revisar y reactivar explícitamente cada cuenta si corresponde. No reviertas la migración en producción sin valorar que se volverá a habilitar el rol anterior.

## Migraciones

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
```

Después de cambiar entidades, genera una migración, revísala y ejecútala. Nunca edites una migración ya aplicada en un entorno compartido: crea una migración nueva.
