# FleetCore API

API REST para administrar vehículos, mecánicos, talleres y mantenimientos de flota. La aplicación está construida con NestJS, TypeScript estricto, PostgreSQL y TypeORM.

## Requisitos

- Node.js 22 LTS y npm.
- PostgreSQL accesible en `localhost:5435` (o `127.0.0.1:5435`).
- Docker Compose, opcional para ejecutar PostgreSQL y la API en contenedores.

La configuración local solicitada es:

| Parámetro     | Valor       |
| ------------- | ----------- |
| Host          | `localhost` |
| Puerto        | `5435`      |
| Usuario       | `postgres`  |
| Contraseña    | `postgres`  |
| Base de datos | `fleetcore` |

No se utiliza el servicio PostgreSQL del puerto `5432` para la ejecución local.

## Instalación y configuración

```bash
npm ci
```

Si todavía no existe `.env`, copia `.env.example` y revisa sus valores. **No sobrescribas un `.env` existente**, porque puede contener configuración local.

```bash
cp .env.example .env
```

Configura como mínimo `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` y `API_KEYS`. El archivo `.env` está excluido de Git.

```bash
npm run migration:run
npm run seed
npm run start:dev
```

La API queda disponible en `http://localhost:3000`. Las migraciones desactivan `synchronize` y son el único mecanismo para modificar el esquema.

## Comandos

| Comando                                                        | Propósito                                            |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| `npm run start:dev`                                            | Desarrollo con recarga                               |
| `npm run build`                                                | Compilación de producción                            |
| `npm run start:prod`                                           | Ejecutar `dist/main.js`                              |
| `npm run migration:show`                                       | Ver migraciones pendientes/aplicadas                 |
| `npm run migration:run`                                        | Compilar y aplicar migraciones                       |
| `npm run migration:revert`                                     | Revertir la última migración                         |
| `npm run migration:create -- src/database/migrations/Nombre`   | Crear una migración vacía                            |
| `npm run migration:generate -- src/database/migrations/Nombre` | Generar una migración comparando entidades y esquema |
| `npm run seed`                                                 | Cargar datos de demostración idempotentemente        |
| `npm test -- --runInBand`                                      | Pruebas unitarias                                    |
| `npm run test:watch`                                           | Pruebas en modo observación                          |
| `npm run test:cov -- --runInBand`                              | Pruebas y umbral de cobertura                        |
| `npm run test:e2e -- --runInBand`                              | Migrar, sembrar y ejecutar e2e en `fleetcore_test`   |
| `npm run lint`                                                 | ESLint                                               |
| `npx prettier --check "src/**/*.ts" "test/**/*.ts"`            | Verificar formato                                    |

Para crear el esquema antes de ejecutar las pruebas e2e, crea una base separada:

```bash
PGPASSWORD=postgres createdb -h 127.0.0.1 -p 5435 -U postgres fleetcore_test
```

El comando e2e **solo** apunta a `fleetcore_test`; nunca elimina datos y no ejecuta pruebas destructivas contra `fleetcore`.

## Swagger

La especificación OpenAPI está en [`http://localhost:3000/api/docs`](http://localhost:3000/api/docs). Incluye esquemas de DTO, autenticación Bearer y `x-api-key`.

## Autenticación, roles y respuestas

- `POST /auth/register`: registro público, siempre crea rol `TECHNICIAN`.
- `POST /auth/login`: verifica bcrypt (y migra hashes Argon2 heredados) y devuelve JWT.
- `GET /auth/profile`: perfil del JWT validado contra el usuario activo en PostgreSQL.
- Roles admitidos: `ADMIN` y `TECHNICIAN`.
- Integraciones: `x-api-key` configurada en `API_KEYS`.
- Las respuestas exitosas usan `{ success, statusCode, data, timestamp }`; los errores incluyen `{ success:false, statusCode, message, path, timestamp }`.

Los usuarios y claves de demostración son exclusivamente para desarrollo:

| Rol           | Usuario                 | Contraseña            |
| ------------- | ----------------------- | --------------------- |
| Administrador | `admin@fleetcore.local` | `FleetCoreAdmin!2026` |
| Técnico 1     | `tech1@fleetcore.local` | `FleetCoreTech!2026`  |
| Técnico 2     | `tech2@fleetcore.local` | `FleetCoreTech!2026`  |

Las claves API de muestra son `demo-key-partner-1` y `demo-key-partner-2`. Sustituye todos estos valores antes de desplegar. La configuración de producción rechaza el secreto JWT de ejemplo, CORS `*` y API Keys que empiecen por `demo-`.

Las contraseñas nuevas usan bcrypt con costo 12. Las contraseñas históricas Argon2 se verifican durante el inicio de sesión y se convierten a bcrypt tras una autenticación correcta, sin invalidarlas. Tras migrar todos los hashes Argon2 y comprobar que no quedan usuarios pendientes, se podrá retirar la compatibilidad Argon2 y su dependencia.

## Docker Compose

```bash
docker compose up --build
docker compose logs -f api
docker compose down
```

Compose crea un PostgreSQL persistente y una API; la API ejecuta migraciones antes de iniciar. El servicio de base de datos se publica por defecto en el puerto host `5435`. Si ese puerto ya lo ocupa una base local, configura `POSTGRES_HOST_PORT=5436` en `.env` antes de iniciar Compose. Dentro de Docker la API usa el host `postgres` y el puerto `5432` del contenedor; la configuración nativa sigue usando `localhost:5435`.

## Dump y restauración

Para incluir esquema, índices, restricciones y datos:

```bash
PGPASSWORD=postgres pg_dump -h 127.0.0.1 -p 5435 -U postgres \
  -d fleetcore --format=custom --no-owner --file=fleetcore.dump
```

Restauración en una base ya creada:

```bash
PGPASSWORD=postgres pg_restore -h 127.0.0.1 -p 5435 -U postgres \
  -d fleetcore --no-owner fleetcore.dump
```

Guarda los dumps y credenciales fuera del repositorio. Usa las credenciales reales del entorno cuando no sea desarrollo.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Base de datos](docs/database.md)
- [API y permisos](docs/api.md)
- [Reglas de negocio](docs/business-rules.md)
- [Seguridad](docs/security.md)
- [Pruebas](docs/testing.md)
- [Operación y solución de problemas](docs/maintenance.md)
