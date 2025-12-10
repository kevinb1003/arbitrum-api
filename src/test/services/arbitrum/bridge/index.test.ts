import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BigNumber, type providers } from 'ethers'
import { BridgeDirection, type BridgeRequest } from '../../../../types/bridge'
import {
  getBridgeTransactionRequest,
  getTokenApprovalRequest,
} from '../../../../services/arbitrum/bridge'
import { cache } from '../../../../lib/cache'
import { baseBody, erc20Address } from '../../../mock'
import { Address } from '../../../../types/web3'

vi.mock('../../../../lib/cache', () => ({
  cache: vi.fn((_key: unknown, _ttl: number, loader: () => Promise<unknown>) =>
    loader()
  ),
}))

const parentProvider = { name: 'parent' } as unknown as providers.Provider
const childProvider = { name: 'child' } as unknown as providers.Provider

const baseRequest: BridgeRequest = baseBody as BridgeRequest

type MockBridger = {
  childNetwork: { name: string }
  getDepositRequest: ReturnType<typeof vi.fn>
  getWithdrawalRequest: ReturnType<typeof vi.fn>
}

const mockBridger = (overrides: Partial<MockBridger> = {}): MockBridger => ({
  childNetwork: { name: 'mock-network' },
  getDepositRequest: vi.fn(async () => ({
    txRequest: { to: '0xabc', data: '0xdef', value: BigNumber.from(1) },
    retryableData: 'retry',
  })),
  getWithdrawalRequest: vi.fn(async () => ({
    txRequest: { to: '0xabc', data: '0xdef', value: BigNumber.from(2) },
  })),
  ...overrides,
})

describe('Arbitrum/bridge', () => {
  describe('getBridgeTransactionRequest', () => {
    beforeEach(() => {
      vi.mocked(cache).mockImplementation(
        (_key: unknown, _ttl: number, loader: () => Promise<unknown>) =>
          loader()
      )
    })

    describe('ETH', () => {
      it('builds deposit payload', async () => {
        const bridger = mockBridger()
        const res = await getBridgeTransactionRequest(
          BridgeDirection.DEPOSIT,
          baseRequest,
          bridger as any,
          false,
          parentProvider,
          childProvider
        )

        expect(bridger.getDepositRequest).toHaveBeenCalledWith(
          expect.objectContaining({ amount: BigNumber.from(1000) })
        )
        expect(res.txRequest).toEqual({
          to: '0xabc',
          data: '0xdef',
          value: '1',
        })
        expect(res.retryableData).toBe('retry')
        expect(res.childNetwork).toEqual({ name: 'mock-network' })
      })

      it('builds withdrawal payload', async () => {
        const bridger = mockBridger()
        const req = {
          ...baseRequest,
          sourceChainId: 42161,
          destinationChainId: 1,
        }
        const res = await getBridgeTransactionRequest(
          BridgeDirection.WITHDRAWAL,
          req,
          bridger as any,
          false,
          parentProvider,
          childProvider
        )

        expect(bridger.getWithdrawalRequest).toHaveBeenCalled()
        expect(res.txRequest).toEqual({
          to: '0xabc',
          data: '0xdef',
          value: '2',
        })
        expect(res.retryableData).toBeUndefined()
      })
    })

    describe('ERC20', () => {
      it('builds deposit payload', async () => {
        const bridger = mockBridger({
          getDepositRequest: vi.fn(async () => ({
            txRequest: { to: '0xabc', data: '0xdef', value: BigNumber.from(3) },
            retryableData: 'retry',
          })),
        })
        const req = { ...baseRequest, tokenAddress: erc20Address }
        const res = await getBridgeTransactionRequest(
          BridgeDirection.DEPOSIT,
          req,
          bridger as any,
          true,
          parentProvider,
          childProvider
        )

        expect(bridger.getDepositRequest).toHaveBeenCalled()
        expect(res.txRequest).toEqual({
          to: '0xabc',
          data: '0xdef',
          value: '3',
        })
        expect(res.retryableData).toBe('retry')
      })

      it('builds deposit payload with destinationAddress fallback to recipient', async () => {
        const bridger = mockBridger()
        let capturedParams: any
        vi.mocked(cache).mockImplementationOnce(async (_key, _ttl, loader) =>
          loader()
        )
        const req = {
          ...baseRequest,
          recipient: '0x9999999999999999999999999999999999999999' as Address,
          tokenAddress: erc20Address,
        }

        await getBridgeTransactionRequest(
          BridgeDirection.DEPOSIT,
          req,
          {
            ...bridger,
            getDepositRequest: vi.fn(async (params) => {
              capturedParams = params
              return {
                txRequest: {
                  to: '0xabc',
                  data: '0xdef',
                  value: BigNumber.from(1),
                },
              }
            }),
          } as any,
          true,
          parentProvider,
          childProvider
        )

        expect(capturedParams.destinationAddress).toBe(req.recipient)
      })

      it('builds withdrawal payload', async () => {
        const bridger = mockBridger({
          getWithdrawalRequest: vi.fn(async () => ({
            txRequest: { to: '0xabc', data: '0xdef', value: BigNumber.from(4) },
          })),
        })
        const req = {
          ...baseRequest,
          sourceChainId: 42161,
          destinationChainId: 1,
          tokenAddress: erc20Address,
        }
        const res = await getBridgeTransactionRequest(
          BridgeDirection.WITHDRAWAL,
          req,
          bridger as any,
          true,
          parentProvider,
          childProvider
        )

        const call = bridger.getWithdrawalRequest.mock.calls[0]?.[0]
        expect(call?.destinationAddress).toBe(req.recipient)
        expect(call?.erc20ParentAddress).toBe(req.tokenAddress)
        expect(res.txRequest).toEqual({
          to: '0xabc',
          data: '0xdef',
          value: '4',
        })
        expect(res.retryableData).toBeUndefined()
      })
    })

    it('normalizes missing tx value to zero', async () => {
      const bridger = mockBridger({
        getDepositRequest: vi.fn(async () => ({
          txRequest: { to: '0xabc', data: '0xdef', value: undefined },
        })),
      })

      const res = await getBridgeTransactionRequest(
        BridgeDirection.DEPOSIT,
        baseRequest,
        bridger as any,
        false,
        parentProvider,
        childProvider
      )

      expect(res.txRequest.value).toBe('0')
    })
  })

  describe('getTokenApprovalRequest', () => {
    it('builds token approval payload', async () => {
      const bridger = {
        getApproveTokenRequest: vi.fn(async () => ({
          to: '0xabc',
          data: '0xdef',
          value: BigNumber.from(0),
        })),
      }

      const res = await getTokenApprovalRequest(
        {
          tokenAddress: erc20Address,
          sender: baseRequest.sender,
          sourceChainId: 1,
        },
        bridger as any,
        parentProvider as any
      )

      expect(bridger.getApproveTokenRequest).toHaveBeenCalledWith({
        erc20ParentAddress: erc20Address,
        parentProvider,
      })
      expect(res.txRequest).toEqual({ to: '0xabc', data: '0xdef', value: '0' })
    })
  })
})
