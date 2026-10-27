# API and permissions

Local base URL: `http://localhost:3000`. Swagger: `/api/docs`. `GET /` is not exposed. All routes, except registration, login, `/health`, and API key integration, require `Authorization: Bearer <token>`.

## Route summary

| Method          | Route                                                  | Access                                                   |
| --------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `POST`          | `/auth/register`                                       | Public; creates only `TECHNICIAN`; limit 10/minute per IP |
| `POST`          | `/auth/login`                                          | Public; limit 10/minute per IP                           |
| `GET`           | `/auth/profile`                                        | Authenticated user                                       |
| `GET`, `POST`   | `/users`                                               | `ADMIN`                                                  |
| `POST`          | `/users/:id/activate` or `/deactivate`                  | `ADMIN`                                                  |
| `GET`           | `/vehicles`, `/vehicles/:id`, `/vehicles/plate/:plate` | `ADMIN`                                                  |
| `POST`, `PATCH` | `/vehicles`, `/vehicles/:id`                           | `ADMIN`                                                  |
| `POST`          | `/vehicles/:id/deactivate`                             | `ADMIN`                                                  |
| `GET`           | `/mechanics`, `/mechanics/:id`                         | `ADMIN`                                                  |
| `POST`          | `/mechanics`                                           | `ADMIN`                                                  |
| `PATCH`         | `/mechanics/:id`                                       | `ADMIN`                                                  |
| `POST`          | `/mechanics/:id/activate` or `/deactivate`              | `ADMIN`                                                  |
| `GET`           | `/workshops`, `/workshops/:id`                         | `ADMIN`                                                  |
| `POST`          | `/workshops`                                           | `ADMIN`                                                  |
| `PATCH`         | `/workshops/:id`                                       | `ADMIN`                                                  |
| `POST`          | `/workshops/:id/activate` or `/deactivate`              | `ADMIN`                                                  |
| `POST`          | `/maintenances`                                        | `ADMIN`                                                  |
| `GET`           | `/maintenances`, `/maintenances/active`                | `ADMIN`; `TECHNICIAN` can only see their assignments     |
| `GET`           | `/maintenances/my-assignments`                         | `TECHNICIAN`                                             |
| `GET`           | `/maintenances/:id`                                    | `ADMIN` or assigned technician                         |
| `PATCH`         | `/maintenances/:id/status`, `/complete`, `/cancel`     | `ADMIN`; assigned technician                             |
| `GET`           | `/vehicles/:id/maintenances`                           | `ADMIN`                                                  |
| `GET`           | `/mechanics/:id/maintenances`                          | `ADMIN`; technicians may access only their own          |
| `GET`           | `/integrations/vehicles/:id/maintenance-history`       | `x-api-key` header                                       |
| `GET`           | `/health`                                              | Public                                                   |

Lists accept `page` (1 by default) and `limit` (20 by default, maximum 100). Vehicles also accept `status` and `plate`; mechanics accept `isActive`. Allowed filters and sort orders are typed; arbitrary SQL is not accepted.

## Response contracts

Success:

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
  "message": "The vehicle already has active maintenance",
  "path": "/maintenances",
  "timestamp": "2026-10-27T12:00:00.000Z"
}
```

The actual HTTP status code is preserved; creations return `201`. Known persistence errors are translated to `400` or `409` without returning SQL or stack traces. Login and registration attempts that exceed the limit return `429`.
