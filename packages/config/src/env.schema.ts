import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3002'),
  ADSERVER_URL: z.string().url().default('http://localhost:3001'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  REDIS_URL: z.string().min(1, 'REDIS_URL é obrigatória'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter ao menos 32 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET deve ter ao menos 32 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  AD_TOKEN_SIGNING_SECRET: z.string().min(32, 'AD_TOKEN_SIGNING_SECRET deve ter ao menos 32 caracteres'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function validateEnv(env: Record<string, unknown> = process.env): EnvConfig {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    console.error('Falha crítica de inicialização: Variáveis de ambiente inválidas:');
    console.error(result.error.format());
    throw new Error('Configuração de ambiente inválida.');
  }
  return result.data;
}

