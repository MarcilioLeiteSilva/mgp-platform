import { Injectable } from '@nestjs/common';
import { EnvConfig, validateEnv } from '@mgp/config';

@Injectable()
export class AppConfigService {
  private readonly config: EnvConfig;

  constructor() {
    this.config = validateEnv(process.env);
  }

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  get port(): number {
    return Number(process.env.PORT_API) || this.config.PORT;
  }

  get jwtAccessSecret(): string {
    return this.config.JWT_ACCESS_SECRET;
  }

  get jwtAccessExpiresIn(): string {
    return this.config.JWT_ACCESS_EXPIRES_IN;
  }

  get jwtRefreshSecret(): string {
    return this.config.JWT_REFRESH_SECRET;
  }

  get jwtRefreshExpiresIn(): string {
    return this.config.JWT_REFRESH_EXPIRES_IN;
  }
}
