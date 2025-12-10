import { describe, expect, it, vi } from 'vitest'
import { BridgeDirection, BridgeType } from '../../../../types/bridge'
import {
  getBridger,
  getDirection,
  formatTxRequest,
} from '../../../../services/arbitrum/bridge/utils'

vi.mock('@arbitrum/sdk', () => {
  class EthBridger {
    childNetwork: any
    constructor(childNetwork: any) {
      this.childNetwork = childNetwork
    }
  }
  class Erc20Bridger {
    childNetwork: any
    constructor(childNetwork: any) {
      this.childNetwork = childNetwork
    }
  }
  return {
    EthBridger,
    Erc20Bridger,
    getArbitrumNetwork: vi.fn(async () => ({
      chainId: 42161,
      parentChainId: 1,
    })),
  }
})

vi.mock('../../../lib/web3/ethers', () => ({
  childChain: { id: 42161 },
}))

describe('Arbitrum/bridge/utils', () => {
  describe('getBridger', () => {
    it('returns EthBridger by default', async () => {
      const bridger = await getBridger()
      expect(bridger.constructor.name).toBe('EthBridger')
    })

    it('returns Erc20Bridger when erc20', async () => {
      const bridger = await getBridger(BridgeType.ERC20)
      expect(bridger.constructor.name).toBe('Erc20Bridger')
    })
  })

  describe('getDirection', () => {
    it('detects deposit L1 -> L2', async () => {
      const bridger = await getBridger()
      const dir = getDirection(bridger, 1, 42161)
      expect(dir).toBe(BridgeDirection.DEPOSIT)
    })

    it('detects withdrawal L2 -> L1', async () => {
      const bridger = await getBridger()
      const dir = getDirection(bridger, 42161, 1)
      expect(dir).toBe(BridgeDirection.WITHDRAWAL)
    })

    it('throws on unsupported pair', async () => {
      const bridger = await getBridger()
      expect(() => getDirection(bridger, 5, 6)).toThrow(
        /Unsupported chain pair/
      )
    })
  })

  describe('buildParams', () => {
    it('normalizes value to string and defaults to 0', () => {
      expect(
        formatTxRequest({ to: '0xabc', data: '0xdef', value: 123n } as any)
      ).toEqual({
        txRequest: { to: '0xabc', data: '0xdef', value: '123' },
      })

      expect(
        formatTxRequest({ to: '0xabc', data: '0xdef', value: undefined } as any)
      ).toEqual({
        txRequest: { to: '0xabc', data: '0xdef', value: '0' },
      })
    })
  })
})
