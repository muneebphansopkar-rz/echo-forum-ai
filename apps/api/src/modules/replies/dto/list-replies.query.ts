import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from '../../../common/pagination/cursor';

export const REPLY_SORT_VALUES = ['top', 'new'] as const;
export type ReplySort = (typeof REPLY_SORT_VALUES)[number];

export class ListRepliesQuery {
  @IsOptional()
  @IsEnum(REPLY_SORT_VALUES)
  sort: ReplySort = 'top';

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
