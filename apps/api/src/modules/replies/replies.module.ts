import { Module } from '@nestjs/common';
import { MentionsModule } from '../mentions/mentions.module';
import { PostsModule } from '../posts/posts.module';
import { RepliesController } from './replies.controller';
import { RepliesRepository } from './replies.repository';
import { RepliesService } from './replies.service';

@Module({
  imports: [PostsModule, MentionsModule],
  controllers: [RepliesController],
  providers: [RepliesService, RepliesRepository],
  exports: [RepliesService, RepliesRepository],
})
export class RepliesModule {}
