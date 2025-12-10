import request from 'supertest'
import { afterAll, beforeEach, describe, it, vi } from 'vitest'
import { makeTestApp } from '../helpers/app'

describe('express-rate-limit middleware', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.RATE_LIMIT_WINDOW_MS = '50'
    process.env.RATE_LIMIT_MAX = '1'
    vi.resetModules()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('blocks on second request within window', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '50'
    process.env.RATE_LIMIT_MAX = '1'
    vi.resetModules()
    const { limiter } = await import('../../middleware/rate-limit')
    const app = makeTestApp((app) =>
      app.get('/ping', limiter, (_req, res) => res.json({ ok: true }))
    )

    await request(app).get('/ping').expect(200, { ok: true })
    await request(app).get('/ping').expect(429)
  })

  it('respects env overrides for max', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '50'
    process.env.RATE_LIMIT_MAX = '2'
    vi.resetModules()
    const { limiter } = await import('../../middleware/rate-limit')
    const app = makeTestApp((app) =>
      app.get('/ping', limiter, (_req, res) => res.json({ ok: true }))
    )

    await request(app).get('/ping').expect(200, { ok: true })
    await request(app).get('/ping').expect(200, { ok: true })
  })
})
