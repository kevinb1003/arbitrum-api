import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiKeyAuth from '../../middleware/auth'
import { makeTestApp } from '../helpers/app'

vi.mock('../../lib/prisma/client', () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma/client'

describe('Auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when api key exists', () => {
    it('allows when api key exists', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
        id: '1',
        key: 'valid',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const app = makeTestApp((app) =>
        app.get('/protected', apiKeyAuth, (_req, res) => res.json({ ok: true }))
      )

      await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid')
        .expect(200, { ok: true })
      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { key: 'valid' },
      })
    })
  })

  describe('when api key does not exist', () => {
    it('rejects when key not found', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce(null)
      const app = makeTestApp((app) =>
        app.get('/protected', apiKeyAuth, (_req, res) => res.json({ ok: true }))
      )

      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid')
        .expect(401)
      expect(res.body.response.error).toBe('Unauthorized')
      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { key: 'invalid' },
      })
    })

    it('rejects when missing header', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce(null)
      const app = makeTestApp((app) =>
        app.get('/protected', apiKeyAuth, (_req, res) => res.json({ ok: true }))
      )

      const res = await request(app).get('/protected').expect(401)
      expect(res.body.response.error).toBe('Unauthorized')
      expect(prisma.apiKey.findUnique).not.toHaveBeenCalled()
    })

    it('returns 401 on unexpected error', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockRejectedValueOnce(
        new Error('db down')
      )
      const app = makeTestApp((app) =>
        app.get('/protected', apiKeyAuth, (_req, res) => res.json({ ok: true }))
      )

      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid')
        .expect(401)
      expect(res.body.response.error).toBe('Unauthorized')
    })
  })
})
