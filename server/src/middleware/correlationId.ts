/**
 * Correlation ID Middleware — §5 RBAC & Access Logging
 *
 * Hər sorğuya unikal correlation_id təyin edir.
 * AsyncLocalStorage ilə bütün asinxron əməliyyatlarda əlçatandır.
 */
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
    correlationId: string;
    requestId: string;
    startTime: number;
}

export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function getCorrelationId(): string {
    return asyncLocalStorage.getStore()?.correlationId || 'unknown';
}

export function getRequestId(): string {
    return asyncLocalStorage.getStore()?.requestId || 'unknown';
}

export function getLatencyMs(): number {
    const start = asyncLocalStorage.getStore()?.startTime || Date.now();
    return Date.now() - start;
}

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    const requestId = uuidv4();

    // Cavab başlığına əlavə et
    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Request-ID', requestId);

    const context: RequestContext = {
        correlationId,
        requestId,
        startTime: Date.now(),
    };

    asyncLocalStorage.run(context, () => next());
}
