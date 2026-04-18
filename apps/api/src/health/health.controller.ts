import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator';

/**
 * Liveness + readiness probe. Public — reachable without auth so deploy
 * platforms (Railway) can hit it.
 */
interface HealthResponse {
  status: 'ok' | 'degraded';
  ts: string;
  db: 'up' | 'down';
}

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Public()
  @SkipThrottle()
  @Get()
  async check(): Promise<HealthResponse> {
    const db = await this.pingDb();
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      ts: new Date().toISOString(),
      db,
    };
  }

  private async pingDb(): Promise<'up' | 'down'> {
    try {
      await this.ds.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }
}
