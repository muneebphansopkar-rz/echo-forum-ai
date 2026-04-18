import { Module } from '@nestjs/common';
import { MentionsModule } from '../mentions/mentions.module';
import { TagsModule } from '../tags/tags.module';
import { PostsController } from './posts.controller';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';

@Module({
  imports: [TagsModule, MentionsModule],
  controllers: [PostsController],
  providers: [PostsService, PostsRepository],
  exports: [PostsService, PostsRepository],
})
export class PostsModule {}
