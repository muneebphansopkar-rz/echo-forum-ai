import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';

/**
 * TypeORM bootstrap.
 *
 * No entities registered yet — each feature module will add its own via
 * `TypeOrmModule.forFeature([...])`. The global connection lives here.
 *
 * Per apps/api/CONTEXT.md: repository pattern only (services depend on
 * custom repositories, never on `Repository<T>` directly).
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres' as const,
        url: config.databaseUrl,
        ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
        // Schema-per-community tenancy resolves per request via TenancyService;
        // the connection itself points at the `public` schema for shared registry tables.
        synchronize: false,
        autoLoadEntities: true,
        logging: config.isProduction ? ['error', 'warn'] : ['error', 'warn'],
      }),
    }),
  ],
})
export class DatabaseModule {
  private readonly logger = new Logger(DatabaseModule.name);

  onModuleInit(): void {
    this.logger.log('Postgres connection ready');
  }
}
