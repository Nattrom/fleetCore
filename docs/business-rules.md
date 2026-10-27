# Reglas de negocio

## Recursos

- Correo y placa se recortan y normalizan antes de persistir.
- Vehículos, mecánicos y talleres con historial se inactivan; no se borran físicamente.
- No se permite disminuir el kilometraje del vehículo.
- Los recursos inactivos no reciben asignaciones nuevas.
- Un usuario vinculado a un mecánico debe estar activo y tener rol `TECHNICIAN`.

## Asignación

Una nueva intervención verifica en una transacción que vehículo, mecánico y taller existen y están activos; además valida el kilometraje inicial, la agenda y la ausencia de otras asignaciones incompatibles.

La agenda excluye el extremo final: dos intervalos que se tocan sin solaparse son válidos. La exclusión GiST y el índice único parcial protegen estas reglas frente a solicitudes concurrentes. Los bloqueos de fila serializan asignaciones y cambios de disponibilidad.

Toda intervención comienza en `SCHEDULED`; el cliente no envía el estado inicial.

## Estados

| Estado actual | Siguiente estado válido    |
| ------------- | -------------------------- |
| `SCHEDULED`   | `IN_PROGRESS`, `CANCELLED` |
| `IN_PROGRESS` | `COMPLETED`, `CANCELLED`   |
| `COMPLETED`   | Ninguno                    |
| `CANCELLED`   | Ninguno                    |

Completar requiere `workPerformed`, `cost` no negativo, `finishedAt` y `finalMileage`. El kilometraje final no puede ser menor que el de la intervención o el vehículo. El cierre actualiza mantenimiento, vehículo y auditoría en una única transacción.

Al comenzar una intervención, el vehículo pasa a `IN_MAINTENANCE`. Al completarla o cancelarla, su disponibilidad se recalcula según las intervenciones activas; nunca se reactiva automáticamente un vehículo `INACTIVE`.

## Permisos

- `ADMIN`: administra recursos, usuarios y mantenimientos.
- `MANAGER`: consulta y supervisa recursos e historiales, sin permisos administrativos de escritura.
- `TECHNICIAN`: consulta y modifica únicamente mantenimientos asignados a su identidad; solo puede efectuar transiciones válidas.
- Integraciones: acceso independiente mediante `x-api-key`.
