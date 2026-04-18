import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_PAGE_SIZE } from '../../../common/pagination/cursor';

export const QUEUE_BUCKETS = [
  'hidden_replies',
  'pinned',
  'locked',
  'tag_overrides',
] as const;
export type QueueBucket = (typeof QUEUE_BUCKETS)[number];

export class TogglePinDto {
  @IsBoolean()
  pinned!: boolean;
}

export class ToggleLockDto {
  @IsBoolean()
  locked!: boolean;
}

export class HideContentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RetagDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tagIds!: string[];

  /** Captured into the audit trail; purely informational. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  previousTagIds?: string[];
}

export class QueueQuery {
  @IsOptional()
  @IsEnum(QUEUE_BUCKETS)
  bucket?: QueueBucket;

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

export interface QueueItemDto {
  id: string;
  bucket: QueueBucket;
  targetType: 'post' | 'reply';
  targetId: string;
  title: string;
  subtitle: string;
  actorUserId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface QueueListResponse {
  items: QueueItemDto[];
  nextCursor: string | null;
}

export interface QueueCountsDto {
  all: number;
  hidden_replies: number;
  pinned: number;
  locked: number;
  tag_overrides: number;
}
