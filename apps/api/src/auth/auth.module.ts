import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MockJwtGuard } from './mock-jwt.guard';
import { RolesGuard } from './roles.guard';

/**
 * Mock-auth module for the hackathon build.
 *
 * When Keycloak integration lands, swap `MockJwtGuard` for a Passport
 * strategy inside this file and leave the rest of the codebase untouched.
 */
@Global()
@Module({
  providers: [
    MockJwtGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: MockJwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [MockJwtGuard, RolesGuard],
})
export class AuthModule {}
