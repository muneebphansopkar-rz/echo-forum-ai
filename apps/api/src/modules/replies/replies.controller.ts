import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListRepliesQuery } from './dto/list-replies.query';
import type { ReplyDto, ReplyListResponse } from './dto/reply.response';
import { RepliesService } from './replies.service';

@Controller('forum')
export class RepliesController {
  constructor(private readonly replies: RepliesService) {}

  @Roles('MEMBER')
  @Get('posts/:id/replies')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) postId: string,
    @Query() query: ListRepliesQuery,
  ): Promise<ReplyListResponse> {
    return this.replies.list(user, tenant, postId, query);
  }

  @Roles('MEMBER')
  @Post('posts/:id/replies')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) postId: string,
    @Body() dto: CreateReplyDto,
    @Req() req: Request & { requestId?: string },
  ): Promise<ReplyDto> {
    return this.replies.create(user, tenant, postId, dto, correlationId(req));
  }

  @Roles('MEMBER')
  @Delete('replies/:id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) replyId: string,
    @Req() req: Request & { requestId?: string },
  ): Promise<{ ok: true }> {
    return this.replies.remove(user, tenant, replyId, correlationId(req));
  }
}
