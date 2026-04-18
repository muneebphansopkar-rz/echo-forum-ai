import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  REQUEST_ID_HEADER,
  makeMeta,
  newRequestId,
  type ErrorEnvelope,
} from '../envelope/envelope';

/**
 * Normalises every error to the SKEP error envelope:
 *   { success: false, error: { code, message, details? }, meta }
 *
 * Controllers throw `new NotFoundException({ code: 'FORUM_POST_NOT_FOUND', message: '…' })`
 * and this filter turns the response object into the final shape. Classes that
 * don't include `code` fall back to a HTTP-status-based code.
 */

const STATUS_TO_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId =
      req.requestId ?? req.header(REQUEST_ID_HEADER) ?? newRequestId();
    res.setHeader(REQUEST_ID_HEADER, requestId);

    const envelope = this.toEnvelope(exception, status, requestId);

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${status} ${envelope.error.code}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(status).json(envelope);
  }

  private toEnvelope(
    exception: unknown,
    status: number,
    requestId: string,
  ): ErrorEnvelope {
    const meta = makeMeta(requestId);

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const fallbackCode = STATUS_TO_CODE[status] ?? 'ERROR';
      if (typeof payload === 'object' && payload !== null) {
        const obj = payload as Record<string, unknown>;
        const code = typeof obj.code === 'string' ? obj.code : fallbackCode;
        const message =
          typeof obj.message === 'string'
            ? obj.message
            : Array.isArray(obj.message)
              ? obj.message.join('; ')
              : exception.message;
        const details =
          typeof obj.details === 'object' && obj.details !== null
            ? obj.details
            : undefined;
        return {
          success: false,
          error: { code, message, ...(details ? { details } : {}) },
          meta,
        };
      }
      return {
        success: false,
        error: { code: fallbackCode, message: exception.message },
        meta,
      };
    }

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' },
      meta,
    };
  }
}
