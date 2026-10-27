# API y permisos

Base URL local: `http://localhost:3000`. Swagger: `/api/docs`. Todas las rutas, excepto registro, login, salud e integración por API Key, requieren `Authorization: Bearer <JWT>`.

## Resumen de rutas

| Método          | Ruta                                                   | Acceso                                                    |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `POST`          | `/auth/register`                                       | Público; solo crea `TECHNICIAN`; límite 10/minuto por IP  |
| `POST`          | `/auth/login`                                          | Público; límite 10/minuto por IP                          |
| `GET`           | `/auth/profile`                                        | Usuario autenticado                                       |
| `GET`, `POST`   | `/users`                                               | `ADMIN`                                                   |
| `POST`          | `/users/:id/activate` o `/deactivate`                  | `ADMIN`                                                   |
| `GET`           | `/vehicles`, `/vehicles/:id`, `/vehicles/plate/:plate` | `ADMIN`, `MANAGER`                                        |
| `POST`, `PATCH` | `/vehicles`, `/vehicles/:id`                           | `ADMIN`                                                   |
| `POST`          | `/vehicles/:id/deactivate`                             | `ADMIN`                                                   |
| `GET`           | `/mechanics`, `/mechanics/:id`                         | `ADMIN`, `MANAGER`                                        |
| `POST`          | `/mechanics`                                           | `ADMIN`                                                   |
| `PATCH`         | `/mechanics/:id`                                       | `ADMIN`                                                   |
| `POST`          | `/mechanics/:id/activate` o `/deactivate`              | `ADMIN`                                                   |
| `GET`           | `/workshops`, `/workshops/:id`                         | `ADMIN`, `MANAGER`                                        |
| `POST`          | `/workshops`                                           | `ADMIN`                                                   |
| `PATCH`         | `/workshops/:id`                                       | `ADMIN`                                                   |
| `POST`          | `/workshops/:id/activate` o `/deactivate`              | `ADMIN`                                                   |
| `POST`          | `/maintenances`                                        | `ADMIN`                                                   |
| `GET`           | `/maintenances`, `/maintenances/active`                | `ADMIN`, `MANAGER`; `TECHNICIAN` solo ve sus asignaciones |
| `GET`           | `/maintenances/my-assignments`                         | `TECHNICIAN`                                              |
| `GET`           | `/maintenances/:id`                                    | `ADMIN`, `MANAGER`; técnico asignado                      |
| `PATCH`         | `/maintenances/:id/status`, `/complete`, `/cancel`     | `ADMIN`; técnico asignado                                 |
| `GET`           | `/vehicles/:id/maintenances`                           | `ADMIN`, `MANAGER`                                        |
| `GET`           | `/mechanics/:id/maintenances`                          | `ADMIN`, `MANAGER`; técnico solo el propio                |
| `GET`           | `/integrations/vehicles/:id/maintenance-history`       | Cabecera `x-api-key`                                      |
| `GET`           | `/health`                                              | Público                                                   |

Los listados aceptan `page` (1 por defecto) y `limit` (20 por defecto, máximo 100). Vehículos también acepta `status` y `plate`; mecánicos acepta `isActive`. Los filtros y ordenamientos permitidos están tipados; no se acepta SQL arbitrario.

## Contratos de respuesta

Éxito:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "timestamp": "2026-10-27T12:00:00.000Z"
}
```

Error:

```json
{
  "success": false,
  "statusCode": 409,
  "message": "El vehículo ya tiene un mantenimiento activo",
  "path": "/maintenances",
  "timestamp": "2026-10-27T12:00:00.000Z"
}
```

El código real de HTTP se conserva; las creaciones responden `201`. Los errores de persistencia conocidos se traducen a `400` o `409` sin devolver SQL ni trazas. Los intentos de login/registro que exceden el límite responden `429`.
