import { rateLimit } from 'express-rate-limit'
import type { Request, Response, NextFunction } from 'express'
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from '../constants'
import { ErrorCode } from '../types/api'

export const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56,
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  handler: (_req: Request, res: Response, _next: NextFunction, options) =>
    res.api(
      {
        error: options.message ?? 'Too many requests',
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
      },
      options.statusCode ?? 429
    ),
})
