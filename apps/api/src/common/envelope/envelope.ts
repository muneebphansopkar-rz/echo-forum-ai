import { randomUUID } from 'node:crypto';

/**
 * SKEP response envelope types.
 * See project/SKEP-INTEGRATION.md for the contract this conforms to.
 */
export interface EnvelopeMeta {
  requestId: string;
  timestamp: string;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: EnvelopeMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: unknown };
  meta: EnvelopeMeta;
}

export type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export const REQUEST_ID_HEADER = 'x-request-id';

export function newRequestId(): string {
  return randomUUID();
}

export function makeMeta(requestId: string): EnvelopeMeta {
  return { requestId, timestamp: new Date().toISOString() };
}
