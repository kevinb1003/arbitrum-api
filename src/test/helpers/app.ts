import express, {
  type Response,
  type Request,
  type NextFunction,
} from 'express'
import { responseFormatter } from '../../middleware/response'
import { SDKError } from '../../lib/errors'

export const makeTestApp = (
  registerRoutes?: (app: express.Express) => void
) => {
  const app = express()
  app.use(express.json())
  app.use(responseFormatter)

  if (registerRoutes) registerRoutes(app)

  // Minimal error handler mirroring production shape
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const api = (
      res as unknown as { api?: (body: unknown, status?: number) => Response }
    ).api

    const isSdkError =
      err instanceof SDKError ||
      ('code' in err && typeof (err as any).code === 'string')
    const payload = isSdkError
      ? {
          error: err.message,
          code: (err as any).code,
          ...((err as any).details && { details: (err as any).details }),
        }
      : {
          error: err.message || 'Internal server error',
          code: 'INTERNAL_ERROR',
        }

    if (typeof api === 'function') {
      return api(payload, 500)
    }
    return res.status(500).json(payload)
  })

  return app
}
