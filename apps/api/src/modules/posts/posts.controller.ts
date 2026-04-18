import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { Roles } from '../../auth/roles.decorator';
import type { TenantContext } from '../../tenancy/tenant-query';
import { correlationId } from '../common/correlation';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQuery } from './dto/list-posts.query';
import type {
  PostDetailDto,
  PostListResponse,
} from './dto/post.response';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('forum/posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Roles('MEMBER')
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListPostsQuery,
  ): Promise<PostListResponse> {
    return this.posts.list(user, tenant, query);
  }

  @Roles('MEMBER')
  @Get(':id')
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PostDetailDto> {
    return this.posts.findById(user, tenant, id);
  }

  @Roles('MEMBER')
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreatePostDto,
    @Req() req: Request & { requestId?: string },
  ): Promise<PostDetailDto> {
    return this.posts.create(user, tenant, dto, correlationId(req));
  }

  @Roles('MEMBER')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePostDto,
    @Req() req: Request & { requestId?: string },
  ): Promise<PostDetailDto> {
    return this.posts.update(user, tenant, id, dto, correlationId(req));
  }

  @Roles('MEMBER')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: Request & { requestId?: string },
  ): Promise<{ ok: true }> {
    return this.posts.remove(user, tenant, id, correlationId(req));
  }
}
