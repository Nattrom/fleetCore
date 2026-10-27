import { z } from 'zod';

export const envValidationSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(5435),
    DB_USERNAME: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('1h'),
    API_KEYS: z.string().min(1),
    CORS_ORIGIN: z.string().default('*'),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== 'production') return;

    if (env.JWT_SECRET === 'cambia-este-secreto-super-seguro') {
      context.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET debe reemplazarse antes del despliegue',
      });
    }
    if (env.CORS_ORIGIN === '*') {
      context.addIssue({
        code: 'custom',
        path: ['CORS_ORIGIN'],
        message:
          'CORS_ORIGIN debe limitarse a orígenes permitidos en producción',
      });
    }
    if (env.API_KEYS.split(',').some((key) => key.trim().startsWith('demo-'))) {
      context.addIssue({
        code: 'custom',
        path: ['API_KEYS'],
        message: 'Las API Keys de demostración no pueden usarse en producción',
      });
    }
  });

export type EnvConfig = z.infer<typeof envValidationSchema>;
