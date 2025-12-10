import type { Request, Response, NextFunction } from 'express'
import { formatApiResponse } from '../utils'

export const responseFormatter = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  res.api = <T>(
    response: T,
    status = 200,
    metadata: Record<string, unknown> = {}
  ) =>
    res.status(status).json(formatApiResponse({ response, status, metadata }))
  next()
}
