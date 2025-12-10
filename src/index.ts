import express, { Request, Response, NextFunction } from 'express'
import createLogger from './lib/logger'
import bodyParser from 'body-parser'
import helmet from 'helmet'
import getBridgeRoutes from './routes/bridge'
import apiKeyAuth from './middleware/auth'
import { limiter } from './middleware/rate-limit'
import { responseFormatter } from './middleware/response'
import { PORT } from './constants'

const run = () => {
  const logger = createLogger('server')
  const app = express()
  const router = express.Router()

  app.use(responseFormatter)

  app.use(apiKeyAuth)
  app.use(limiter)

  app.use(bodyParser.json({ limit: '5mb' }))
  app.set('json spaces', 3)
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  )

  app.use(helmet())

  app.get('/', (_req, res) =>
    res.api({ message: 'Arbitrum SDK API', version: '1.0.0' })
  )

  app.use('/bridge', getBridgeRoutes(router))

  app.use((err: Error, _: Request, res: Response, __: NextFunction) => {
    logger.error(err)

    // Check if it's an SDKError with error code
    if (err instanceof Error && 'code' in err) {
      const sdkError = err as {
        code: string
        message: string
        details?: Record<string, unknown>
      }

      return res.api(
        {
          error: sdkError.message,
          code: sdkError.code,
          ...(sdkError.details && { details: sdkError.details }),
        },
        500
      )
    }

    return res.api(
      {
        error: err.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      500
    )
  })

  app.listen(PORT, () => logger.info(`Listening to port ${PORT}`))
}

run()
