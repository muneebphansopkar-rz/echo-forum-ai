import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** Matches `createReplySchema` in apps/web/src/lib/zod/reply.ts. */
export class CreateReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  body!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID('4')
  parentReplyId?: string | null;
}
