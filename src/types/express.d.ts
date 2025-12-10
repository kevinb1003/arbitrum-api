import type { Response as ExpressResponse } from 'express'

declare module 'express-serve-static-core' {
  interface Response {
    api: <T>(
      response: T,
      status?: number,
      metadata?: Record<string, unknown>
    ) => ExpressResponse
  }
}
