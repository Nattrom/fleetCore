# Arquitectura

FleetCore utiliza módulos NestJS organizados por dominio. Los controladores validan y enrutan solicitudes; los servicios contienen reglas de negocio y usan repositorios TypeORM; las entidades describen el modelo persistente. `AppModule` configura PostgreSQL, configuración validada, autenticación y módulos de dominio.

## Módulos

- `auth`: registro, login, JWT, validación de identidad y perfil.
- `users`: creación administrativa, consulta segura y activación/inactivación.
- `vehicles`: vehículos, normalización de placas e inactivación lógica.
- `mechanics`: técnicos, enlace opcional con usuario y disponibilidad.
- `workshops`: talleres y activación/inactivación.
- `maintenances`: planificación, asignación, transiciones, cierres e historiales.
- `integrations`: consulta paginada de historial protegida por API Key.
- `audit`: registro de operaciones relevantes y sanitizadas.
- `common`: guards, decoradores, paginación, respuestas y excepciones compartidas.
- `database`: data source CLI, migraciones y seeder.

## Petición HTTP

1. `ValidationPipe` transforma y valida DTO; los campos desconocidos se rechazan.
2. `JwtAuthGuard` protege por defecto, salvo rutas `@Public()`.
3. `RolesGuard` valida el rol obtenido desde la identidad reconsultada en PostgreSQL.
4. `ApiKeyGuard` protege de forma independiente la ruta de integración.
5. El servicio ejecuta reglas de dominio y transacciones cuando hay escrituras múltiples.
6. `ResponseInterceptor` envuelve respuestas exitosas y el filtro global normaliza errores.

## Decisiones relevantes

- TypeScript `strict` y módulos ESM.
- TypeORM con migraciones versionadas; `synchronize` permanece desactivado.
- Los IDs son UUID; el dinero se conserva como `numeric(12,2)` en PostgreSQL.
- Restricciones de PostgreSQL complementan las comprobaciones de servicio para concurrencia.
- Se usa paginación de tamaño máximo 100; no se cargan historiales completos por defecto.
- El contenedor es multietapa y ejecuta el proceso con el usuario no privilegiado `node`.

No se incorporan cachés, colas ni microservicios: no son necesarios para los flujos actuales.
