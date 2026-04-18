import type { Request } from 'express';
import { REQUEST_ID_HEADER, newRequestId } from '../../common/envelope/envelope';

/**
 * Returns the correlation id for the current request. The interceptor stashes
 * it on `req.requestId`; if we're outside a request (tests, jobs) fall back
 * to a fresh uuid.
 */
export function correlationId(req?: Request & { requestId?: string }): string {
  if (req?.requestId) return req.requestId;
  const hdr = req?.header?.(REQUEST_ID_HEADER);
  return typeof hdr === 'string' && hdr.length > 0 ? hdr : newRequestId();
}
