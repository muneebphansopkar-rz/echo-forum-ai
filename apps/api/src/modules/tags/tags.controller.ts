import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { Roles } from '../../auth/roles.decorator';
import type { TenantContext } from '../../tenancy/tenant-query';
import { correlationId } from '../common/correlation';
import { CreateTagDto } from './dto/create-tag.dto';
import type { TagResponse } from './dto/tag.response';
import { TagsService } from './tags.service';

@Controller('forum/tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Roles('MEMBER')
  @Get()
  list(@Tenant() tenant: TenantContext): Promise<TagResponse[]> {
    return this.tags.list(tenant);
  }

  @Roles('ADMIN')
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateTagDto,
    @Req() req: Request & { requestId?: string },
  ): Promise<TagResponse> {
    return this.tags.create(user, tenant, dto, correlationId(req));
  }
}
