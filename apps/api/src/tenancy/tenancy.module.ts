import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenancyService } from './tenancy.service';
import { TenancyMiddleware } from './tenancy.middleware';

@Global()
@Module({
  providers: [TenancyService, TenancyMiddleware],
  exports: [TenancyService, TenancyMiddleware],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Public health probe doesn't need a tenant context.
    consumer.apply(TenancyMiddleware).exclude('health').forRoutes('*');
  }
}
