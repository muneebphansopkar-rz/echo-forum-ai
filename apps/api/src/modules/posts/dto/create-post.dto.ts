import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Matches `createPostSchema` in apps/web/src/lib/zod/post.ts.
 *  - title ≤ 200 chars
 *  - body ≤ 10,000 chars (Markdown — stored as-is; sanitization is frontend)
 *  - at least one tag, max three
 */
export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  body!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsUUID('4', { each: true })
  tagIds!: string[];
}
