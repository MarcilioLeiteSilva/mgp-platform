export interface AdServerConfig {
  PORT: number;
  HOST: string;
  NODE_ENV: string;
  REDIS_URL: string;
  HMAC_SECRET: string;
  TOKEN_TTL_SECONDS: number;
  NONCE_TTL_SECONDS: number;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_MS: number;
  CORS_ORIGIN: string;
}

export function loadAdServerConfig(): AdServerConfig {
  return {
    PORT: Number(process.env.PORT) || Number(process.env.PORT_ADSERVER) || 3001,
    HOST: process.env.HOST || '0.0.0.0',
    NODE_ENV: process.env.NODE_ENV || 'development',
    REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    HMAC_SECRET: process.env.AD_SERVER_SECRET || process.env.JWT_SECRET || 'mgp_super_secret_ad_server_key_2026',
    TOKEN_TTL_SECONDS: Number(process.env.TOKEN_TTL_SECONDS) || 900, // 15 minutos
    NONCE_TTL_SECONDS: Number(process.env.NONCE_TTL_SECONDS) || 600, // 10 minutos
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 500, // 500 req/min por IP
    RATE_LIMIT_WINDOW_MS: 60 * 1000,
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  };
}

