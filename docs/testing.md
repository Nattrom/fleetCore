# Pruebas

## Unitarias

```bash
npm test -- --runInBand
npm run test:watch
npm run test:cov -- --runInBand
```

Jest exige globalmente al menos 40% de líneas y sentencias, y 35% de funciones y ramas. Las pruebas cubren autenticación/bcrypt, transición de hashes Argon2, autorización por rol, filtro, interceptor, auditoría, integración, recursos, mantenimiento y transiciones.

## E2E PostgreSQL

Las pruebas usan una base independiente `fleetcore_test`; no apuntan a `fleetcore` y no borran tablas/datos.

```bash
PGPASSWORD=postgres createdb -h 127.0.0.1 -p 5435 -U postgres fleetcore_test
npm run test:e2e -- --runInBand
```

El script aplica migraciones, ejecuta el seeder idempotente y después prueba HTTP real sobre NestJS y PostgreSQL. Requiere que PostgreSQL de pruebas esté disponible en el puerto configurado de desarrollo, `5435`.

Para verificar la idempotencia manualmente:

```bash
DB_NAME=fleetcore_test npm run seed
DB_NAME=fleetcore_test npm run seed
```

No ejecutes pruebas de integración que limpien o reinicialicen la base `fleetcore`.
