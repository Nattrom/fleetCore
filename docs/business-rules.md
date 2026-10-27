# Business rules

## Resources

- Email addresses and license plates are trimmed and normalized before persistence.
- Vehicles, mechanics, and workshops with history are deactivated; they are not physically deleted.
- Vehicle mileage cannot be decreased.
- Inactive resources cannot receive new assignments.
- A user linked to a mechanic must be active and have the `TECHNICIAN` role.

## Assignment

A new maintenance operation verifies within a transaction that the vehicle, mechanic, and workshop exist and are active; it also validates the initial mileage, schedule, and absence of other incompatible assignments.

The schedule excludes the end boundary: two intervals that touch without overlapping are valid. The GiST exclusion constraint and partial unique index protect these rules against concurrent requests. Row locks serialize assignments and availability changes.

Every maintenance operation starts in `SCHEDULED`; the client does not send the initial status.

## Statuses

| Current status | Next valid status        |
| ------------- | -------------------------- |
| `SCHEDULED`   | `IN_PROGRESS`, `CANCELLED` |
| `IN_PROGRESS` | `COMPLETED`, `CANCELLED`   |
| `COMPLETED`   | None                       |
| `CANCELLED`   | None                       |

Completion requires `workPerformed`, a non-negative `cost`, `finishedAt`, and `finalMileage`. Final mileage cannot be less than the mileage recorded for the maintenance operation or the vehicle. Closing updates the maintenance record, vehicle, and audit log in a single transaction.

When a maintenance operation begins, the vehicle status changes to `IN_MAINTENANCE`. When it is completed or cancelled, availability is recalculated based on active maintenance operations; an `INACTIVE` vehicle is never automatically reactivated.

## Permissions

- `ADMIN`: manages resources, users, and maintenance operations.
- `TECHNICIAN`: views and modifies only maintenance operations assigned to their identity; they can only perform valid transitions.
- Integrations: independent access via `x-api-key`.
