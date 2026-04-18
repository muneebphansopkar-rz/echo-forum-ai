import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, map } from 'rxjs';
import {
  REQUEST_ID_HEADER,
  makeMeta,
  newRequestId,
  type SuccessEnvelope,
} from '../envelope/envelope';

/**
 * Wraps every successful response in `{ success: true, data, meta }`.
 *
 * Honours an incoming `X-Request-Id` header (used for correlation across
 * SKEP modules) or generates a fresh one. The header is echoed back and
 * stashed on the request so the exception filter and domain events can
 * pick up the same id.
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T>
  implements NestInterceptor<T, SuccessEnvelope<T>>
{
  intercept(
    ctx: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessEnvelope<T>> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string }>();
    const res = http.getResponse<Response>();

    const existing = req.header(REQUEST_ID_HEADER);
    const requestId = existing && existing.length > 0 ? existing : newRequestId();
    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    return next.handle().pipe(
      map(
        (data): SuccessEnvelope<T> => ({
          success: true,
          data,
          meta: makeMeta(requestId),
        }),
      ),
    );
  }
}
