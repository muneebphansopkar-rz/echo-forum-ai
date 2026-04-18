import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { TagsModule } from './modules/tags/tags.module';
import { PostsModule } from './modules/posts/posts.module';
import { RepliesModule } from './modules/replies/replies.module';
import { VotesModule } from './modules/votes/votes.module';
import { SearchModule } from './modules/search/search.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { MentionsModule } from './modules/mentions/mentions.module';
import { StatsModule } from './modules/stats/stats.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => [
        { ttl: config.throttleTtlSeconds * 1000, limit: config.throttleLimit },
      ],
    }),
    AuthModule,
    TenancyModule,
    EventsModule,
    HealthModule,
    MentionsModule,
    TagsModule,
    PostsModule,
    RepliesModule,
    VotesModule,
    SearchModule,
    ModerationModule,
    StatsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
