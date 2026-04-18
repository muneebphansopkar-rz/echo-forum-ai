import { describe, it, expect } from 'vitest';
import { MentionsService } from './mentions.service';

describe('MentionsService.extract (pure unit)', () => {
  const svc = new MentionsService({
    publish: async () => undefined,
  } as never);

  it('pulls @USR-style mentions and uppercases', () => {
    const out = svc.extract('Hey @USR123 and @usr456 please review. Also @USR123 twice.');
    expect(out.sort()).toEqual(['USR123', 'USR456']);
  });

  it('prepends USR when bare id is given', () => {
    const out = svc.extract('Look at @abc42 please');
    expect(out).toEqual(['USRABC42']);
  });

  it('returns empty when nothing matches', () => {
    expect(svc.extract('plain text, no mentions')).toEqual([]);
  });
});
