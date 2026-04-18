import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from '../../../common/pagination/cursor';

export const FEED_VALUES = ['hot', 'new', 'top'] as const;
export type FeedKind = (typeof FEED_VALUES)[number];

export const TOP_WINDOW_VALUES = ['today', 'week', 'all'] as const;
export type TopWindow = (typeof TOP_WINDOW_VALUES)[number];

export class ListPostsQuery {
  @IsOptional()
  @IsEnum(FEED_VALUES)
  sort: FeedKind = 'hot';

  @IsOptional()
  @IsEnum(TOP_WINDOW_VALUES)
  window?: TopWindow;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;
}
