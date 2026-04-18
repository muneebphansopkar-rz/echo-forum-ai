import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './mock-jwt.guard';

/** Marks an endpoint as auth-free. Honoured by `MockJwtGuard`. */
export const Public = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(IS_PUBLIC_KEY, true);
