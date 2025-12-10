import { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma/client'

const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unauthorized = () => res.api({ error: 'Unauthorized' }, 401)

    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) return unauthorized()

    const apiKey = authHeader.split(' ')[1]
    const keyRecord = await prisma.apiKey.findUnique({ where: { key: apiKey } })

    if (!keyRecord) return unauthorized()

    return next()
  } catch (_error) {
    return res.api({ error: 'Unauthorized' }, 401)
  }
}

export default apiKeyAuth
