/**
 * TypeORM CLI DataSource — used by `typeorm migration:run`. The runtime app
 * builds its own connection via `TypeOrmModule.forRootAsync` in
 * `DatabaseModule`.
 *
 * Run commands from `apps/api/` (where `.env` lives). Paths are resolved
 * relative to `process.cwd()` so this module works under both CommonJS and
 * ESM loaders.
 */
import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { DataSource } from 'typeorm';

const apiRoot = process.cwd();

// Minimal .env loader so the CLI works without pulling in dotenv.
(() => {
  const envPath = path.resolve(apiRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    if (process.env[k] === undefined) process.env[k] = v;
  }
})();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL missing — cannot build TypeORM DataSource');
}

export default new DataSource({
  type: 'postgres',
  url,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [path.join(apiRoot, 'src/modules/**/entities/*.entity.{ts,js}')],
  migrations: [path.join(apiRoot, 'src/migrations/*.{ts,js}')],
  migrationsTableName: '_forum_migrations',
  logging: ['error', 'warn'],
});
