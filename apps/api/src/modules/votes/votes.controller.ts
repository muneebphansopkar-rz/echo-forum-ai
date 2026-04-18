import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { Roles } from '../../auth/roles.decorator';
import type { TenantContext } from '../../tenancy/tenant-query';
import { correlationId } from '../common/correlation';
import { ToggleVoteDto, type ToggleVoteResult } from './dto/toggle-vote.dto';
import { VotesService } from './votes.service';

@Controller('forum/votes')
export class VotesController {
  constructor(private readonly votes: VotesService) {}

  @Roles('MEMBER')
  @Post()
  toggle(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: ToggleVoteDto,
    @Req() req: Request & { requestId?: string },
  ): Promise<ToggleVoteResult> {
    return this.votes.toggle(user, tenant, dto, correlationId(req));
  }
}
