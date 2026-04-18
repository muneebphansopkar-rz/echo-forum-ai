import type { PostSummaryDto } from '../../posts/dto/post.response';

/** Matches `searchResultSchema` in apps/web/src/lib/zod/search.ts. */
export interface SearchResultDto extends PostSummaryDto {
  highlights: {
    title: string | null;
    body: string | null;
  };
}

export interface SearchListResponse {
  items: SearchResultDto[];
  nextCursor: string | null;
}
