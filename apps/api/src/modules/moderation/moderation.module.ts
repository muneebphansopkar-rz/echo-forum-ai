import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { RepliesModule } from '../replies/replies.module';
import { TagsModule } from '../tags/tags.module';
import { ModerationController } from './moderation.controller';
import { ModerationRepository } from './moderation.repository';
import { ModerationService } from './moderation.service';

@Module({
  imports: [PostsModule, RepliesModule, TagsModule],
  controllers: [ModerationController],
  providers: [ModerationService, ModerationRepository],
  exports: [ModerationService, ModerationRepository],
})
export class ModerationModule {}
