import { vi } from 'vitest'
import { Address } from '../types/web3'

export const baseBody = {
  amount: '1000',
  sender: '0xabc0000000000000000000000000000000000000',
  recipient: '0xdef0000000000000000000000000000000000000',
  sourceChainId: 1,
  destinationChainId: 42161,
  tokenAddress: '0x0000000000000000000000000000000000000000',
}

export const bridgePayloadMock = {
  txRequest: { to: '0xabc', data: '0xdef', value: '1' },
  retryableData: null,
  childNetwork: { id: 42161 },
}

export const erc20Address =
  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address // USDC on Arbitrum Sepolia

export const erc20Body = {
  ...baseBody,
  tokenAddress: '0xabc0000000000000000000000000000000000000',
}

export const mockAllowance = vi.fn()

export const createMockBridger = () => ({
  childNetwork: { chainId: 42161, parentChainId: 1 },
  getDepositRequest: vi.fn(async () => ({
    txRequest: { to: '0xabc', data: '0xdef', value: 1n },
    retryableData: 'retry',
  })),
  getWithdrawalRequest: vi.fn(async () => ({
    txRequest: { to: '0xabc', data: '0xdef', value: 2n },
  })),
  isDepositDisabled: vi.fn(),
  isRegistered: vi.fn(),
  getParentGatewayAddress: vi.fn(),
})

export const primeDefaultMocks = (
  bridger: ReturnType<typeof createMockBridger>
) => {
  bridger.isDepositDisabled.mockResolvedValue(false)
  bridger.isRegistered.mockResolvedValue(true)
  bridger.getParentGatewayAddress.mockResolvedValue('0xgateway')
  mockAllowance.mockResolvedValue({
    toString: () => '1000',
    lt: () => false,
  })
}
