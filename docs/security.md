# Seguridad

- Las contraseñas nuevas se almacenan con bcrypt y costo 12; nunca se devuelven en respuestas.
- Los hashes Argon2 existentes se verifican en el login y se rehashean como bcrypt al autenticarse correctamente. Se conserva temporalmente la dependencia Argon2 hasta migrar todas las cuentas.
- El registro público fuerza el rol `TECHNICIAN`; el primer administrador se crea con `npm run seed`.
- JWT con secreto y expiración configurables. La estrategia valida firma/expiración y vuelve a leer usuario, rol y mecánico activo desde PostgreSQL.
- Guards globales de autenticación; los únicos roles son `ADMIN` y `TECHNICIAN`. La identidad y el rol se recargan desde PostgreSQL, por lo que un rol incluido en el JWT no concede privilegios.
- Login y registro limitados a 10 intentos por minuto y dirección IP; el exceso responde `429`.
- DTO estrictos con `whitelist`, `forbidNonWhitelisted` y transformación.
- Helmet, CORS configurado, compresión y errores sin SQL, stack traces ni secretos.
- Auditoría registra acción y metadatos sanitizados, nunca tokens, contraseñas ni claves.
- Restricciones PostgreSQL y transacciones protegen integridad y concurrencia.

## Producción

Establece un `JWT_SECRET` aleatorio de al menos 32 caracteres, `API_KEYS` reales y `CORS_ORIGIN` limitado a los orígenes permitidos. La aplicación rechaza en producción el secreto de muestra, CORS `*` y claves `demo-*`. No incluyas `.env`, dumps con datos personales ni credenciales en Git o en imágenes Docker.

Las credenciales del seeder y API Keys de ejemplo son solo locales. El contador de solicitudes se mantiene en memoria por instancia; detrás de múltiples instancias configura un almacenamiento compartido para el limitador o aplica protección equivalente en el gateway.

Express no confía en proxies por defecto. Si se despliega detrás de un proxy inverso, configura explícitamente los saltos de confianza para obtener la IP cliente correcta; no confíes indiscriminadamente en cabeceras reenviadas por el cliente.
