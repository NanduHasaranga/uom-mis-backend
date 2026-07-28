import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    // Nest also runs global filters for non-HTTP contexts (e.g. the RabbitMQ
    // @RabbitSubscribe consumer) — there's no real request/response there, so
    // just log and let the caller's own error handling (NACK) proceed.
    if (host.getType() !== 'http') {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
      return;
    }

    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : null;

    const message =
      body && typeof body === 'object' && 'message' in body
        ? (body as { message: string | string[] }).message
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        JSON.stringify({ method: req.method, url: req.originalUrl, status, message }),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(status).json({
      statusCode: status,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
