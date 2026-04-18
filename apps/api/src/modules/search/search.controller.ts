import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { Roles } from '../../auth/roles.decorator';
import type { TenantContext } from '../../tenancy/tenant-query';
import { SearchQuery } from './dto/search.query';
import type { SearchListResponse } from './dto/search.response';
import { SearchService } from './search.service';

@Controller('forum/search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Roles('MEMBER')
  @Get()
  run(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: TenantContext,
    @Query() query: SearchQuery,
  ): Promise<SearchListResponse> {
    return this.search.search(user, tenant, query);
  }
}
