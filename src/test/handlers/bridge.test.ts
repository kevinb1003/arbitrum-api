import request from 'supertest'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import express from 'express'
import {
  handleBridgeTransaction,
  handleTokenApproval,
} from '../../handlers/bridge'
import { SDKError } from '../../lib/errors'
import { ErrorCode } from '../../types/api'
import { BridgeDirection } from '../../types/bridge'
import { makeTestApp } from '../helpers/app'
import {
  baseBody,
  createMockBridger,
  erc20Body,
  mockAllowance,
  primeDefaultMocks,
} from '../mock'

const mockBridger = createMockBridger()

vi.mock('../../validation/utils', () => ({
  validate: vi.fn((_schema, payload) => payload),
}))

vi.mock('../../services/arbitrum/bridge/utils', () => ({
  getBridger: vi.fn(async () => mockBridger),
  getDirection: vi.fn(() => BridgeDirection.DEPOSIT),
}))

vi.mock('../../services/arbitrum/bridge', () => ({
  getBridgeTransactionRequest: vi.fn(async () => ({
    txRequest: { to: '0xabc', data: '0xdef', value: '1' },
    retryableData: 'retry',
  })),
  getTokenApprovalRequest: vi.fn(async () => ({
    txRequest: { to: '0xabc', data: '0xdef', value: '0' },
  })),
}))

vi.mock('../../lib/web3/ethers', () => ({
  isAddressEqual: vi.fn((a, b) => a === b),
  parentChain: { id: 1 },
  parentProvider: {} as any,
  childProvider: {} as any,
  zeroAddress: '0x0000000000000000000000000000000000000000',
  getCachedContract: vi.fn(() => ({
    allowance: mockAllowance,
  })),
}))

vi.mock('../../lib/cache', () => ({
  cache: vi.fn((_key, _ttl, loader) => loader()),
}))

import { validate } from '../../validation/utils'
import {
  getBridgeTransactionRequest,
  getTokenApprovalRequest,
} from '../../services/arbitrum/bridge'
import { getDirection } from '../../services/arbitrum/bridge/utils'

describe('handlers/bridge', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    primeDefaultMocks(mockBridger)
    vi.mocked(getDirection).mockReturnValue(BridgeDirection.DEPOSIT)
  })

  describe('handleBridgeTransaction', () => {
    const buildApp = () =>
      makeTestApp((app) => {
        const router = express.Router()
        router.post('/bridge', handleBridgeTransaction)
        app.use(router)
      })

    it('returns bridge payload', async () => {
      const res = await request(buildApp())
        .post('/bridge')
        .send(baseBody)
        .expect(200)

      expect(validate).toHaveBeenCalled()
      expect(getBridgeTransactionRequest).toHaveBeenCalled()
      expect(res.body.response.txRequest).toMatchObject({
        to: '0xabc',
        data: '0xdef',
        value: '1',
      })
      expect(res.body.response.retryableData).toBe('retry')
    })

    it('passes getDirection result into bridge request', async () => {
      vi.mocked(getDirection).mockReturnValueOnce(BridgeDirection.WITHDRAWAL)

      await request(buildApp()).post('/bridge').send(baseBody).expect(200)

      expect(getDirection).toHaveBeenCalled()
      expect(getBridgeTransactionRequest).toHaveBeenCalledWith(
        BridgeDirection.WITHDRAWAL,
        expect.objectContaining({
          sourceChainId: baseBody.sourceChainId,
          destinationChainId: baseBody.destinationChainId,
        }),
        expect.anything(),
        false,
        expect.anything(),
        expect.anything()
      )
    })

    describe('ERC20 guards', () => {
      it('throws when deposits are disabled', async () => {
        mockBridger.isDepositDisabled.mockResolvedValueOnce(true)

        const res = await request(buildApp())
          .post('/bridge')
          .send(erc20Body)
          .expect(500)

        expect(res.body.response.code).toBe(ErrorCode.TOKEN_DEPOSIT_DISABLED)
        expect(mockBridger.isDepositDisabled).toHaveBeenCalled()
      })

      it('throws when token is not registered', async () => {
        mockBridger.isRegistered.mockResolvedValueOnce(false)

        const res = await request(buildApp())
          .post('/bridge')
          .send(erc20Body)
          .expect(500)

        expect(res.body.response.code).toBe(ErrorCode.TOKEN_NOT_REGISTERED)
        expect(mockBridger.isRegistered).toHaveBeenCalled()
      })

      it('throws when allowance is insufficient', async () => {
        mockAllowance.mockResolvedValueOnce({
          toString: () => '5',
          lt: (value: string | number | bigint) => BigInt('5') < BigInt(value),
        })

        const res = await request(buildApp())
          .post('/bridge')
          .send(erc20Body)
          .expect(500)

        expect(res.body.response.code).toBe(ErrorCode.TOKEN_NOT_APPROVED)
        expect(mockAllowance).toHaveBeenCalled()
      })
    })

    it('bubbles SDKError from handler', async () => {
      vi.mocked(getBridgeTransactionRequest).mockRejectedValueOnce(
        new SDKError(ErrorCode.BRIDGE_REQUEST_FAILED, 'unknown error')
      )

      const res = await request(buildApp())
        .post('/bridge')
        .send(baseBody)
        .expect(500)

      expect(res.body.response.code).toBe(ErrorCode.BRIDGE_REQUEST_FAILED)
      expect(res.body.response.error).toContain('unknown error')
    })
  })

  describe('handleTokenApproval', () => {
    const buildApp = () =>
      makeTestApp((app) => {
        const router = express.Router()
        router.post('/approve', handleTokenApproval)
        app.use(router)
      })

    it('returns approval payload', async () => {
      const res = await request(buildApp())
        .post('/approve')
        .send({
          tokenAddress: erc20Body.tokenAddress,
          sender: baseBody.sender,
          sourceChainId: 1,
        })
        .expect(200)

      expect(getTokenApprovalRequest).toHaveBeenCalled()
      expect(res.body.response.txRequest).toMatchObject({
        to: '0xabc',
        data: '0xdef',
        value: '0',
      })
    })

    it('throws when approval is requested on wrong chain', async () => {
      const res = await request(buildApp())
        .post('/approve')
        .send({
          tokenAddress: erc20Body.tokenAddress,
          sender: baseBody.sender,
          sourceChainId: 999,
        })
        .expect(500)

      expect(res.body.response.code).toBe(ErrorCode.INVALID_CHAIN_PAIR)
      expect(res.body.response.error).toContain(
        'Token approval must be requested from L1'
      )
    })
  })
})
