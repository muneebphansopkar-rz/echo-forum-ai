import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './config.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): AppConfig['NODE_ENV'] {
    return this.get('NODE_ENV');
  }
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
  get port(): number {
    return this.get('API_PORT');
  }
  get apiPrefix(): string {
    return this.get('API_PREFIX');
  }
  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }
  get databaseSsl(): boolean {
    return this.get('DATABASE_SSL');
  }
  get redisUrl(): string {
    return this.get('REDIS_URL');
  }
  get jwtSecret(): string {
    return this.get('SKEP_JWT_SECRET');
  }
  get jwtAudience(): string {
    return this.get('JWT_AUDIENCE');
  }
  get jwtIssuer(): string {
    return this.get('JWT_ISSUER');
  }
  get throttleTtlSeconds(): number {
    return this.get('THROTTLE_TTL_SECONDS');
  }
  get throttleLimit(): number {
    return this.get('THROTTLE_LIMIT');
  }
  get corsOrigins(): string[] {
    return this.get('CORS_ORIGINS');
  }
}
