import { DataSource } from 'typeorm';
import 'dotenv/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envValidationSchema } from '../config/env.validation.js';

const env = envValidationSchema.parse(process.env);
const dataSourceDirectory = dirname(fileURLToPath(import.meta.url));

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities: [join(dataSourceDirectory, '../**/*.entity.js')],
  migrations: [join(dataSourceDirectory, 'migrations/*.js')],
  synchronize: false,
  logging: false,
});
