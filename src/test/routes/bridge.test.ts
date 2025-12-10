import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import express, { type Response } from 'express'
import getRoutes from '../../routes/bridge'
import { makeTestApp } from '../helpers/app'
import {
  handleBridgeTransaction,
  handleTokenApproval,
} from '../../handlers/bridge'
import { baseBody, bridgePayloadMock } from '../mock'

type ApiResponseRes = Response & {
  api: (body: unknown, status?: number) => Response
}

vi.mock('../../handlers/bridge', () => ({
  handleBridgeTransaction: vi.fn(async (_req, res) =>
    (res as ApiResponseRes).api(bridgePayloadMock)
  ),
  handleTokenApproval: vi.fn(async (_req, res) =>
    (res as ApiResponseRes).api({ ok: true })
  ),
}))

describe('routes/bridge', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('routes bridge transaction requests', async () => {
    vi.mocked(handleBridgeTransaction).mockImplementationOnce(
      async (req, res) => {
        expect(req.body).toEqual(baseBody)
        return (res as ApiResponseRes).api(bridgePayloadMock)
      }
    )

    const app = makeTestApp((app) => {
      const router = express.Router()
      app.use('/bridge', getRoutes(router))
    })

    const res = await request(app).post('/bridge').send(baseBody).expect(200)

    expect(handleBridgeTransaction).toHaveBeenCalled()
    expect(res.body.response.txRequest).toMatchObject(
      bridgePayloadMock.txRequest
    )
  })

  it('routes token approval requests', async () => {
    const approvalBody = {
      tokenAddress: baseBody.tokenAddress,
      sender: baseBody.sender,
      sourceChainId: baseBody.sourceChainId,
    }
    vi.mocked(handleTokenApproval).mockImplementationOnce(async (req, res) => {
      expect(req.body).toEqual(approvalBody)
      return (res as ApiResponseRes).api({ ok: true })
    })

    const app = makeTestApp((app) => {
      const router = express.Router()
      app.use('/bridge', getRoutes(router))
    })

    const res = await request(app)
      .post('/bridge/approve/token')
      .send(approvalBody)
      .expect(200)

    expect(handleTokenApproval).toHaveBeenCalled()
    expect(res.body.response).toMatchObject({ ok: true })
  })

  describe('returns 500 when', () => {
    it('bridge handler throws', async () => {
      vi.mocked(handleBridgeTransaction).mockImplementationOnce((req) => {
        expect(req.body).toEqual(baseBody)
        throw new Error('handler error')
      })
    })

    it('approval handler throws', async () => {
      const approvalBody = {
        tokenAddress: baseBody.tokenAddress,
        sender: baseBody.sender,
        sourceChainId: baseBody.sourceChainId,
      }
      vi.mocked(handleTokenApproval).mockImplementationOnce(async (req) => {
        expect(req.body).toEqual(approvalBody)
        throw new Error('approval error')
      })

      const app = makeTestApp((app) => {
        const router = express.Router()
        app.use('/bridge', getRoutes(router))
      })

      const res = await request(app)
        .post('/bridge/approve/token')
        .send(approvalBody)
        .expect(500)

      expect(res.body.response.error).toContain('approval error')
    })
  })
})
