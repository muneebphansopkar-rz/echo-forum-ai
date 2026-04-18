import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Matches `createTagSchema` in apps/web/src/lib/zod/tag.ts. */
export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^[a-z0-9][a-z0-9-]*$/, { message: 'slug must be lowercase kebab-case' })
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label!: string;

  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be a 6-digit hex (#RRGGBB)' })
  color!: string;
}
