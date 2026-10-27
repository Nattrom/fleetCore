export default () => ({
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number.parseInt(process.env.DB_PORT ?? '5435', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME ?? 'fleetcore',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  apiKeys: (process.env.API_KEYS || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean),
  corsOrigin: process.env.CORS_ORIGIN || '*',
});
