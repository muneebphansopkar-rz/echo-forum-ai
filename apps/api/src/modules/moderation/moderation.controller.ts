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
import {
  HideContentDto,
  QueueQuery,
  RetagDto,
  ToggleLockDto,
  TogglePinDto,
  type QueueCountsDto,
  type QueueListResponse,
} from './dto/moderation.dto';
import { ModerationService } from './moderation.service';

/**
 * Moderation endpoints. All require MODERATOR+ role.
 *
 * Pin/lock/hide/restore live under `forum/moderation/*` to keep the
 * resource intent explicit — the post-state mutations are moderator
 * actions, not self-service edits.
 */
@Controller('forum/moderation')
export class ModerationController {
  constructor(private readonly mod: ModerationService) {}

  @Roles('MODERATOR')
  @Get('queue')
  queue(
    @Tenant() tenant: TenantContext,
    @Query() query: QueueQuery,
  ): Promise<QueueListResponse> {
    return this.mod.queue(tenant, query);
  }

  @Roles('MODERATOR')
  @Get('counts')
  counts(@Tenant() tenant: TenantContext): Promise<QueueCountsDto> {
    return this.mod.counts(tenant);
  }

  @Roles('MODERATOR')
  @Post('posts/:id/pin')
  pin(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: TogglePinDto,
    @Req() req: Request & { requestId?: string },
  ): Promise<{ ok: true; pinned: boolean }> {
    return this.mod.togglePin(user, tenant, id, dto, correlationId(req));
  }

  @Roles('MODERATOR')
  @Post('posts/:id/lock')
  lock(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ToggleLockDto,
    @Req() req: Request & { requestId?: string },
  ): Promise<{ ok: true; locked: boolean }> {
    return this.mod.toggleLock(user, tenant, id, dto, correlationId(req));
  }

  @Roles('MODERATOR')
  @Post('posts/:id/retag')
  retag(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RetagDto,
    @Req() req: Request & { requestId?: string },
  ): Promise<{ ok: true; tagIds: string[] }> {
    return this.mod.retag(user, tenant, id, dto, correlationId(req));
  }

  @Roles('MODERATOR')
  @Post('posts/:id/hide')
  hidePost(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: HideContentDto,
    @Req() req: Request & { requestId?: string },
  ): Promise<{ ok: true }> {
    return this.mod.hide(user, tenant, 'post', id, dto, correlationId(req));
  }

  @Roles('MODERATOR')
  @Post('replies/:id/hide')
  hideReply(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: HideContentDto,
    @Req() req: Request & { requestId?: string },
  ): Promise<{ ok: true }> {
    return this.mod.hide(user, tenant, 'reply', id, dto, correlationId(req));
  }

  @Roles('MODERATOR')
  @Delete('posts/:id/hide')
  @HttpCode(HttpStatus.OK)
  restorePost(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: Request & { requestId?: string },
  ): Promise<{ ok: true }> {
    return this.mod.restore(user, tenant, 'post', id, correlationId(req));
  }

  @Roles('MODERATOR')
  @Delete('replies/:id/hide')
  @HttpCode(HttpStatus.OK)
  restoreReply(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: Request & { requestId?: string },
  ): Promise<{ ok: true }> {
    return this.mod.restore(user, tenant, 'reply', id, correlationId(req));
  }
}
