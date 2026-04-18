import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { Test, type TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as jwt from 'jsonwebtoken';
import supertest from 'supertest';
import { AppModule } from '../../app.module';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { ResponseEnvelopeInterceptor } from '../../common/interceptors/response-envelope.interceptor';

/**
 * Shared integration-test harness.
 *
 * Boots the real Nest app against the live `skep_forum_dev` Postgres so the
 * tenancy middleware, mock-JWT guard, envelope interceptor and exception
 * filter all run exactly as they do in prod. Redis is best-effort — the
 * events service no-ops cleanly when unreachable.
 */

// Minimal .env loader so tests pick up DATABASE_URL/REDIS_URL without dotenv.
(() => {
  const apiRoot = path.resolve(__dirname, '../../../');
  const envPath = path.resolve(apiRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (process.env[k] === undefined) process.env[k] = v;
  }
})();

export interface MintTokenOpts {
  role?: 'MEMBER' | 'MODERATOR' | 'ADMIN' | 'OWNER';
  platformUserId?: string;
  communityCode?: string;
}

export function mintToken(opts: MintTokenOpts = {}): string {
  const secret =
    process.env.SKEP_JWT_SECRET ?? 'dev-only-shared-secret-rotate-in-prod';
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: `test-sub-${Math.random().toString(36).slice(2, 8)}`,
      platform_user_id: opts.platformUserId ?? 'USR61220651',
      keycloak_user_id: `kc-${Math.random().toString(36).slice(2, 10)}`,
      community_code: opts.communityCode ?? 'COM96179941',
      org_id: 'be2064fc-9d31-47a9-9e08-646d1fd57f1d',
      roles: [opts.role ?? 'OWNER'],
      type: 'COMMUNITY',
      iat: now,
      exp: now + 60 * 60,
    },
    secret,
    {
      algorithm: 'HS256',
      issuer: process.env.JWT_ISSUER ?? 'skep-api',
    },
  );
}

export type HttpAgent = ReturnType<typeof supertest>;

export interface Harness {
  app: NestExpressApplication;
  http: () => HttpAgent;
  module: TestingModule;
  close: () => Promise<void>;
  prefix: string;
}

export async function buildApp(): Promise<Harness> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication<NestExpressApplication>({
    bufferLogs: true,
  });
  const prefix = process.env.API_PREFIX ?? '/api/v1';
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  return {
    app,
    module,
    prefix,
    http: () => supertest(app.getHttpServer()),
    async close() {
      await app.close();
    },
  };
}

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/** Return true if the test DB is reachable. Tests skip when offline. */
export async function dbReachable(): Promise<boolean> {
  try {
    const harness = await buildApp();
    await harness.close();
    return true;
  } catch {
    return false;
  }
}
